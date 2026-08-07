import os
import logging
from typing import List, Dict, Any
from backend.app.config import settings

logger = logging.getLogger(__name__)

# Fallback In-Memory Document Store
class FallbackSearchEngine:
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []

    def add_document(self, doc_id: str, title: str, content: str, doc_type: str):
        # Prevent duplicates
        self.documents = [doc for doc in self.documents if doc["id"] != doc_id]
        self.documents.append({
            "id": doc_id,
            "title": title,
            "content": content,
            "doc_type": doc_type
        })

    def search(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        query_words = set(query.lower().split())
        scored_docs = []
        for doc in self.documents:
            content_lower = doc["content"].lower()
            title_lower = doc["title"].lower()
            
            # Simple TF-IDF approximation / Word overlap score
            score = 0
            for word in query_words:
                if word in title_lower:
                    score += 5  # Heavily weight title matches
                if word in content_lower:
                    score += content_lower.count(word)
            
            if score > 0:
                scored_docs.append((score, doc))
        
        # Sort by score descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored_docs[:limit]]

class PolicyRAG:
    def __init__(self):
        self.use_fallback = True
        self.chroma_client = None
        self.collection = None
        self.fallback_engine = FallbackSearchEngine()

        try:
            import chromadb
            # Initialize Chroma client
            persist_dir = settings.CHROMA_PERSIST_DIR
            os.makedirs(persist_dir, exist_ok=True)
            
            self.chroma_client = chromadb.PersistentClient(path=persist_dir)
            # Create or get collection
            self.collection = self.chroma_client.get_or_create_collection(
                name="finops_policies"
            )
            self.use_fallback = False
            logger.info("ChromaDB initialized successfully.")
        except Exception as e:
            logger.warning(f"ChromaDB initialization failed: {e}. Falling back to in-memory search.")
            self.use_fallback = True

    def ingest_policy(self, doc_id: str, title: str, content: str, doc_type: str):
        """Add policy content to vector store/fallback store."""
        # Always feed the fallback store as a backup
        self.fallback_engine.add_document(doc_id, title, content, doc_type)
        
        if not self.use_fallback and self.collection:
            try:
                self.collection.upsert(
                    ids=[doc_id],
                    documents=[content],
                    metadatas=[{"title": title, "doc_type": doc_type}]
                )
                logger.info(f"Ingested policy to Chroma: {title}")
            except Exception as e:
                logger.error(f"Chroma ingest error for {title}: {e}")

    def search_policies(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Query vector database for matching policy context."""
        if self.use_fallback or not self.collection:
            return self.fallback_engine.search(query, limit)
            
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=limit
            )
            
            formatted = []
            if results and results.get("ids") and len(results["ids"][0]) > 0:
                for i in range(len(results["ids"][0])):
                    formatted.append({
                        "id": results["ids"][0][i],
                        "content": results["documents"][0][i],
                        "title": results["metadatas"][0][i].get("title", ""),
                        "doc_type": results["metadatas"][0][i].get("doc_type", "")
                    })
                return formatted
        except Exception as e:
            logger.error(f"Chroma search error: {e}. Falling back to keyword search.")
            
        return self.fallback_engine.search(query, limit)

# Singleton Instance
policy_rag = PolicyRAG()
