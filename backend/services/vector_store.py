from typing import List, Tuple, Optional
import os
from langchain.schema import Document
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from chromadb.config import Settings as ChromaSettings
from config import settings
import logging

logger = logging.getLogger(__name__)


class VectorStoreService:
    def __init__(self):
        # Use Ollama with DeepSeek model for embeddings (runs locally, free!)
        self.embedding_function = OllamaEmbeddings(
            model=settings.embedding_model,
            base_url=settings.ollama_base_url
        )
        
        # Create vector store directory if it doesn't exist
        os.makedirs(settings.vector_db_path, exist_ok=True)
        
        # Initialize vector store with cosine similarity
        # With cosine similarity, higher scores (closer to 1.0) indicate higher similarity 
        # This is generally more intuitive for semantic search
        chroma_settings = ChromaSettings(
            anonymized_telemetry=False,
            is_persistent=True,
        )
        
        self.vector_store = Chroma(
            collection_name="financial_documents",
            embedding_function=self.embedding_function,
            persist_directory=settings.vector_db_path,
            client_settings=chroma_settings,
            collection_metadata={"hnsw:space": "cosine"} # Use cosine space which directly maps to similarity
        )
        
        logger.info(f"Initialized vector store at {settings.vector_db_path}")
    
    def add_documents(self, documents: List[Document]) -> List[str]:
        """Add documents to the vector store"""
        try:
            logger.info(f"Adding {len(documents)} documents to vector store")
            document_ids = self.vector_store.add_documents(documents)
            self.vector_store.persist()
            logger.info(f"Successfully added {len(documents)} documents to vector store")
            return document_ids
        except Exception as e:
            logger.error(f"Error adding documents to vector store: {str(e)}")
            raise
    
    def similarity_search(self, query: str, k: Optional[int] = None) -> List[Tuple[Document, float]]:
        """Search for similar documents with scores using direct similarity"""
        try:
            if k is None:
                k = settings.retrieval_k
                
            logger.info(f"Searching for similar documents with query: {query}, k={k}")
          
            # ChromaDB with cosine returns DISTANCE (0 = identical, 2 = opposite)
            # We need to convert to SIMILARITY (1 = identical, 0 = opposite)
            results = self.vector_store.similarity_search_with_score(
                query, 
                k=k
            )
            
            # Convert cosine distance to similarity score: similarity = 1 - (distance / 2)
            # This converts distance [0, 2] to similarity [1, 0]
            converted_results = [
                (doc, 1 - (distance / 2)) for doc, distance in results
            ]
            
            # Filter by similarity threshold, but make sure we return at least some results
            scores = [score for _, score in converted_results]
            logger.info(f"Initial search returned {len(converted_results)} results with similarity scores: {scores}")
            filtered_results = [
                (doc, score) for doc, score in converted_results 
                if score >= settings.similarity_threshold
            ]
            
            # If no results meet the threshold, return the top 3 results anyway
            if not filtered_results and converted_results:
                logger.warning(f"No results met the similarity threshold {settings.similarity_threshold}, returning top 3 result")
                filtered_results = converted_results[:3]
            
            # Sort results by score in descending order (higher similarity = better)
            filtered_results.sort(key=lambda x: x[1], reverse=True)
            
            # Remove duplicate documents by comparing page content
            unique_results = []
            seen_content = set()
            
            for doc, score in filtered_results:
                # Create a content identifier - using page_content as the unique identifier
                # You could also use other fields like metadata if more appropriate
                content_id = doc.page_content
                
                # If we haven't seen this content before, add it to results
                if content_id not in seen_content:
                    seen_content.add(content_id)
                    unique_results.append((doc, score))
            
            logger.info(f"Found {len(unique_results)} unique relevant documents after deduplication")
            return unique_results
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise
    
    def delete_documents(self, document_ids: List[str]) -> None:
        """Delete documents from vector store"""
        try:
            logger.info(f"Deleting {len(document_ids)} documents from vector store")
            self.vector_store.delete(document_ids)
            self.vector_store.persist()
            logger.info("Successfully deleted documents from vector store")
        except Exception as e:
            logger.error(f"Error deleting documents: {str(e)}")
            raise
    
    def get_document_count(self) -> int:
        """Get total number of documents in vector store"""
        try:
            # This might need to be adjusted based on your vector store implementation
            # For Chroma, we can use the _collection attribute to get the count
            count = len(self.vector_store.get()['ids'])
            logger.info(f"Vector store contains {count} documents")
            return count
        except Exception as e:
            logger.error(f"Error getting document count: {str(e)}")
            return 0