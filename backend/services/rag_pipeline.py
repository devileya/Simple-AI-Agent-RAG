from typing import List, Dict, Any, Tuple, Optional
import time
from langchain.schema import Document
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
from services.vector_store import VectorStoreService
from models.schemas import DocumentSource
from config import settings
import logging

logger = logging.getLogger(__name__)


class RAGPipeline:
    def __init__(self, vector_store_service: VectorStoreService = None):
        # Initialize vector store service
        self.vector_store = vector_store_service or VectorStoreService()
        
        # Initialize LLM with Ollama (local, free)
        self.llm = Ollama(
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            base_url=settings.ollama_base_url
        )

        # Store conversation memories per session
        self.session_memories: Dict[str, ConversationBufferMemory] = {}
        
        # Initialize prompt template for QA
        self.qa_prompt_template = PromptTemplate.from_template(
            """You are a helpful financial analyst assistant. 
            Answer the following question based ONLY on the provided context from a financial statement.
            If you cannot find the answer in the context, give the similar information.
            Do not make up or infer information not present in the provided context.
            Format numerical data appropriately.

            Previous conversation:
            {chat_history}
            
            Context: {context}
            
            Question: {question}
            
            Answer:"""
        )
        
        logger.info(f"Initialized RAG pipeline with LLM model {settings.llm_model}")
    
    def _get_or_create_memory(self, session_id: str) -> ConversationBufferMemory:
        """Get existing memory for session or create new one"""
        if session_id not in self.session_memories:
            self.session_memories[session_id] = ConversationBufferMemory(
                memory_key="chat_history",
                input_key="question",
                return_messages=True,
                output_key="answer"
            )
            logger.info(f"Created new conversation memory for session: {session_id}")
        return self.session_memories[session_id]
    
    def _get_qa_chain(self, session_id: Optional[str] = None) -> LLMChain:
        """Get QA chain with session-specific memory"""
        if session_id:
            memory = self._get_or_create_memory(session_id)
            return LLMChain(
                llm=self.llm,
                prompt=self.qa_prompt_template,
                memory=memory,
                output_key="answer"
            )
        else:
            # No session - create chain without memory
            return LLMChain(
                llm=self.llm,
                prompt=self.qa_prompt_template,
                output_key="answer"
            )
    
    def generate_answer(self, question: str, session_id: Optional[str] = None, chat_history: List[Dict[str, str]] = None, document_filter: str = None) -> Dict[str, Any]:
        """Generate answer using RAG pipeline"""
        start_time = time.time()
        
        try:
            # 1. Retrieve relevant documents with scores
            docs_with_scores = self._retrieve_documents_with_scores(question, document_filter)
            logger.info(f"Retrieved {len(docs_with_scores)} documents with scores {docs_with_scores}")
            
            # 2. Generate context from retrieved documents
            context = self._generate_context([doc for doc, _ in docs_with_scores])
            
            # 3. Generate answer using LLM
            answer = self._generate_llm_response(question, context, session_id, chat_history)
            
            # 4. Format document sources
            sources = []
            for i, (doc, score) in enumerate(docs_with_scores):
                logger.info(f"Processing source {i}: score={score}, metadata={doc.metadata}")
                try:
                    source = DocumentSource(
                        content=doc.page_content[:200] + "...",  # Truncate for response
                        page=doc.metadata.get("page", 0),
                        score=float(score),  # Convert to float for serialization
                        metadata=doc.metadata
                    )
                    sources.append(source)
                    logger.info(f"Added source {i} to response")
                except Exception as e:
                    logger.error(f"Error processing source {i}: {str(e)}")
            
            logger.info(f"Generated {len(sources)} sources for response")
            
            processing_time = time.time() - start_time
            
            # 5. Return answer with sources and processing time
            return {
                "answer": answer,
                "sources": sources,
                "processing_time": round(processing_time, 2)
            }
        
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Error generating answer: {str(e)}\n{error_trace}")
            processing_time = time.time() - start_time
            
            return {
                "answer": "I'm sorry, there was an error processing your question.",
                "sources": [],
                "processing_time": round(processing_time, 2),
                "error": str(e)
            }
    
    def _retrieve_documents_with_scores(self, query: str, document_filter: str = None) -> List[Tuple[Document, float]]:
        """Retrieve relevant documents with similarity scores"""
        logger.info(f"Retrieving documents for query: {query}, document_filter: {document_filter}")
        
        # Debug log vector store state
        try:
            count = self.vector_store.get_document_count()
            logger.info(f"Vector store contains {count} documents")
        except Exception as e:
            logger.error(f"Error getting document count: {str(e)}")
        
        # Get documents with scores using cosine similarity
        results = self.vector_store.similarity_search(query)
        logger.info(f"Initial search returned {len(results)} results")
        
        # Log some details about the results for debugging
        for i, (doc, score) in enumerate(results[:3]):  # Log first 3 results
            logger.info(f"Result {i}: score={score}, metadata={doc.metadata}")
        
        # Apply document filtering if specified
        if document_filter:
            filtered_results = [
                (doc, score) for doc, score in results
                if doc.metadata.get('source', '').endswith(document_filter)
            ]
            logger.info(f"Filtered from {len(results)} to {len(filtered_results)} documents based on filter: {document_filter}")
            
            # If no results after filtering, use all results
            if not filtered_results and results:
                logger.warning(f"No documents matched filter '{document_filter}', using all results")
                return results
                
            return filtered_results
        
        return results
    
    def _retrieve_documents(self, query: str) -> List[Document]:
        """Retrieve relevant documents without scores"""
        return [doc for doc, _ in self._retrieve_documents_with_scores(query)]
    
    def _generate_context(self, documents: List[Document]) -> str:
        """Generate context from retrieved documents"""
        context_parts = []
        
        for i, doc in enumerate(documents):
            # Format each document chunk with its metadata
            source_info = f"Document {i+1} (Page {doc.metadata.get('page', 'unknown')}):"
            context_parts.append(f"{source_info}\n{doc.page_content}\n")
        
        # Join all document chunks into a single context string
        return "\n\n".join(context_parts)
    
    def _generate_llm_response(self, question: str, context: str, session_id: Optional[str] = None, chat_history: List[Dict[str, str]] = None) -> str:
        """Generate response using LLM"""
        logger.info(f"Generating LLM response for question: {question}, session_id: {session_id}")
        
        try:
            # Use session-based memory if session_id provided
            if session_id:
                qa_chain = self._get_qa_chain(session_id)
                response = qa_chain.run({
                    "context": context,
                    "question": question
                })
            else:
                # Fallback to manual chat history formatting (backward compatibility)
                formatted_history = ""
                if chat_history and len(chat_history) > 0:
                    for entry in chat_history:
                        if "user" in entry:
                            formatted_history += f"Human: {entry['user']}\n"
                        if "assistant" in entry:
                            formatted_history += f"Assistant: {entry['assistant']}\n"
                
                qa_chain = self._get_qa_chain()
                response = qa_chain.run({
                    "context": context,
                    "question": question,
                    "chat_history": formatted_history
                })
            
            return response.strip()
        
        except Exception as e:
            logger.error(f"Error generating LLM response: {str(e)}")
            raise 