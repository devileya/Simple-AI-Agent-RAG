import os
import re
from typing import List, Dict, Any, Tuple, Optional
import PyPDF2
import pdfplumber
import fitz  # PyMuPDF
import pandas as pd
from io import StringIO
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from config import settings
import logging
import time
import unicodedata

logger = logging.getLogger(__name__)


class PDFProcessor:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )
        self.upload_dir = settings.pdf_upload_path
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # Regex patterns for text cleaning
        self.space_pattern = re.compile(r'\s+')  # Multiple spaces
        self.bracket_pattern = re.compile(r'\(([^)]+)\)')  # Content in parentheses
        self.number_pattern = re.compile(r'(\d{1,3}(?:,\d{3})*\.\d+|\d{1,3}(?:,\d{3})*|\d+\.\d+)')  # Numbers with commas
        
        logger.info(f"Initialized PDF processor with chunk_size={settings.chunk_size}, "
                  f"chunk_overlap={settings.chunk_overlap}")
    
    def clean_text(self, text: str) -> str:
        """Clean extracted text by normalizing spaces and special characters"""
        if not text:
            return ""
        
        # Normalize unicode characters
        text = unicodedata.normalize('NFKC', text)
        
        # Fix broken lines due to column formatting
        lines = text.split('\n')
        result_lines = []
        current = ""
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current:
                    result_lines.append(current)
                    current = ""
                result_lines.append("")
            elif stripped[-1:] in '.,:;?!' or len(stripped) > 50:  # Likely end of sentence or long enough
                current += " " + stripped if current else stripped
                result_lines.append(current)
                current = ""
            else:
                current += " " + stripped if current else stripped
        
        if current:  # Don't forget the last line
            result_lines.append(current)
        
        text = '\n'.join(result_lines)
        
        # Normalize spaces
        text = self.space_pattern.sub(' ', text)
        
        return text.strip()
    
    def extract_bracketed_content(self, text: str) -> List[str]:
        """Extract content inside parentheses to ensure it's properly processed"""
        return self.bracket_pattern.findall(text)
    
    def extract_text_from_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """Extract text from PDF and return page-wise content with enhanced table processing"""
        pages_content = []
        logger.info(f"Extracting text from PDF: {file_path}")
        
        try:
            # Use PyMuPDF (fitz) for better structure preservation
            doc = fitz.open(file_path)
            
            # Try extracting with multiple methods to get the best results
            for i, page in enumerate(doc):
                page_content = ""
                page_num = i + 1
                
                # 1. Extract tables with pdfplumber
                tables_text = self.extract_tables(file_path, page_num)
                if tables_text:
                    page_content += f"\n\n{tables_text}\n\n"
                
                # 2. Extract text with PyMuPDF for better structure
                text_blocks = page.get_text("blocks")
                blocks_text = "\n\n".join([block[4] for block in text_blocks if block[4].strip()])
                
                if blocks_text.strip():
                    page_content += blocks_text
                
                # 3. If still no content, try regular text extraction with PyMuPDF
                if not page_content.strip():
                    raw_text = page.get_text("text")
                    if raw_text.strip():
                        page_content = raw_text
                
                # 4. As a last resort, use pdfplumber
                if not page_content.strip():
                    with pdfplumber.open(file_path) as pdf:
                        if i < len(pdf.pages):
                            plumber_text = pdf.pages[i].extract_text() or ""
                            if plumber_text.strip():
                                page_content = plumber_text
                
                # Clean and normalize the extracted text
                if page_content.strip():
                    cleaned_text = self.clean_text(page_content)
                    
                    # Log the extraction success with character count for monitoring
                    logger.info(f"Page {page_num}: Extracted {len(cleaned_text)} characters")
                    
                    pages_content.append({
                        "content": cleaned_text,
                        "page": page_num,
                        "source": file_path
                    })
                else:
                    logger.warning(f"No content extracted from page {page_num}")
            
            logger.info(f"Successfully extracted content from {len(pages_content)} pages")
            return pages_content
        
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise
            
    def extract_tables(self, file_path: str, page_num: int) -> str:
        """Extract tables from the specified page and convert to text format"""
        try:
            tables_text = ""
            with pdfplumber.open(file_path) as pdf:
                if page_num <= len(pdf.pages):
                    page = pdf.pages[page_num - 1]
                    tables = page.extract_tables()
                    
                    if not tables:
                        return ""
                    
                    logger.info(f"Found {len(tables)} tables on page {page_num}")
                    
                    for table_idx, table in enumerate(tables):
                        if not table:
                            continue
                            
                        # Convert table to DataFrame for better processing
                        df = pd.DataFrame(table)
                        
                        # Handle header row - often first row is header
                        if len(df) > 1:
                            # Use first row as header if it doesn't contain numeric values
                            first_row_has_numbers = any(self.number_pattern.search(str(cell)) for cell in df.iloc[0] if cell)
                            if not first_row_has_numbers:
                                headers = df.iloc[0]
                                df = df[1:]
                                df.columns = headers
                        
                        # Clean up the table data
                        df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
                        df = df.applymap(lambda x: None if x == "" else x)
                        
                        # Convert to string format
                        table_str = df.to_string(index=False, na_rep="")
                        if table_str.strip():
                            tables_text += f"TABLE {table_idx + 1} (Page {page_num}):\n{table_str}\n\n"
                    
                    return tables_text
            return ""
        except Exception as e:
            logger.warning(f"Error extracting tables from page {page_num}: {str(e)}")
            return ""
    
    def split_into_chunks(self, pages_content: List[Dict[str, Any]]) -> List[Document]:
        """Split page content into chunks while preserving table structures and special characters"""
        documents = []
        
        for page in pages_content:
            content = page["content"]
            page_num = page["page"]
            source = page["source"]
            filename = os.path.basename(source)
            
            # Special handling for table content - preserve table structure by detecting table markers
            table_sections = []
            non_table_sections = []
            current_section = ""
            is_in_table = False
            
            for line in content.split('\n'):
                if line.strip().startswith('TABLE ') and '(Page ' in line:
                    # We've hit a table marker, store the previous non-table section if any
                    if current_section and not is_in_table:
                        non_table_sections.append(current_section)
                    
                    # Start a new table section
                    current_section = line + '\n'
                    is_in_table = True
                elif is_in_table and not line.strip():
                    # Empty line might signify the end of a table
                    if current_section:
                        table_sections.append(current_section)
                    current_section = ""
                    is_in_table = False
                else:
                    # Continue adding to current section
                    current_section += line + '\n'
            
            # Don't forget the last section
            if current_section:
                if is_in_table:
                    table_sections.append(current_section)
                else:
                    non_table_sections.append(current_section)
            
            # Process non-table sections with normal chunking
            for section in non_table_sections:
                # Apply custom chunking logic for non-table content
                splits = self.text_splitter.split_text(section)
                
                for i, split in enumerate(splits):
                    doc = Document(
                        page_content=split,
                        metadata={
                            "page": page_num,
                            "source": source,
                            "chunk": i + 1,
                            "content_type": "text",
                            "filename": filename
                        }
                    )
                    documents.append(doc)
            
            # Process table sections as individual chunks to preserve table structure
            for j, table in enumerate(table_sections):
                # Create a single document for each table to preserve structure
                doc = Document(
                    page_content=table,
                    metadata={
                        "page": page_num,
                        "source": source,
                        "chunk": j + 1,
                        "content_type": "table",
                        "filename": filename
                    }
                )
                documents.append(doc)
        
        # Additional post-processing for special characters
        for doc in documents:
            # Extract and process content within parentheses
            bracketed_content = self.extract_bracketed_content(doc.page_content)
            if bracketed_content:
                # Add special metadata to help the retrieval process
                doc.metadata["has_bracketed_content"] = True
                doc.metadata["bracketed_items"] = len(bracketed_content)
            
            # Handle numerical data better for financial documents
            numerical_matches = self.number_pattern.findall(doc.page_content)
            if numerical_matches:
                doc.metadata["has_numerical_data"] = True
                doc.metadata["numerical_count"] = len(numerical_matches)
        
        logger.info(f"Created {len(documents)} document chunks with special handling for tables and parentheses")
        return documents
    
    def process_pdf(self, file_path: str) -> List[Document]:
        """Process PDF file and return list of Document objects"""
        start_time = time.time()
        
        # 1. Extract text from PDF
        pages_content = self.extract_text_from_pdf(file_path)
        
        # 2. Split text into chunks
        documents = self.split_into_chunks(pages_content)
        
        processing_time = time.time() - start_time
        logger.info(f"PDF processing completed in {processing_time:.2f} seconds")
        
        return documents 