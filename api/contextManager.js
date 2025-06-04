const crypto = require("crypto");

class ContextManager {
  constructor() {
    this.useSupermemory = process.env.USE_SUPERMEMORY === 'true';
    this.supermemoryApiKey = process.env.SUPERMEMORY_API_KEY;
    this.supermemoryBaseUrl = process.env.SUPERMEMORY_BASE_URL || 'https://api.supermemory.ai/v3';
    this.maxTokens = 120000; // Conservative limit for GPT-4o
    this.chunkSize = 8000; // Size for each context chunk
  }

  async storeContext(content, sessionId, metadata = {}) {
    if (!this.useSupermemory || !this.supermemoryApiKey) {
      console.warn('Supermemory not configured, using in-memory context management');
      return this.storeInMemory(content, sessionId, metadata);
    }

    try {
      const response = await fetch(`${this.supermemoryBaseUrl}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supermemoryApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          sessionId,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            type: 'memo_generation'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Supermemory API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Successfully stored context in Supermemory');
      return result;
    } catch (error) {
      console.error('Error storing context in Supermemory:', error);
      return this.storeInMemory(content, sessionId, metadata);
    }
  }

  async retrieveContext(sessionId, query = '', limit = 5) {
    if (!this.useSupermemory || !this.supermemoryApiKey) {
      return this.retrieveInMemory(sessionId, query);
    }

    try {
      const searchQuery = query || `sessionId:${sessionId}`;
      const response = await fetch(`${this.supermemoryBaseUrl}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supermemoryApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          sessionId,
          limit,
          filters: {
            type: 'memo_generation'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Supermemory search error: ${response.status}`);
      }

      const results = await response.json();
      return results.memories || [];
    } catch (error) {
      console.error('Error retrieving context from Supermemory:', error);
      return this.retrieveInMemory(sessionId, query);
    }
  }

  async manageTokenLimit(content, sessionId) {
    const tokenCount = this.estimateTokens(content);

    if (tokenCount <= this.maxTokens) {
      return content;
    }

    console.log(`Content exceeds token limit (${tokenCount} > ${this.maxTokens}), using context management`);

    // Store full content for future reference
    await this.storeContext(content, sessionId, {
      tokenCount,
      fullContent: true
    });

    // Extract key information and create summarized version
    const chunks = this.chunkContent(content);
    const keyChunks = await this.selectKeyChunks(chunks, sessionId);

    return keyChunks.join('\n\n');
  }

  chunkContent(content) {
    const words = content.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i += this.chunkSize) {
      chunks.push(words.slice(i, i + this.chunkSize).join(' '));
    }

    return chunks;
  }

  async selectKeyChunks(chunks, sessionId) {
    // For now, select first few chunks and last few chunks
    // This could be enhanced with semantic analysis
    const totalChunks = chunks.length;
    const keepCount = Math.min(6, totalChunks);

    if (totalChunks <= keepCount) {
      return chunks;
    }

    const selectedChunks = [
      ...chunks.slice(0, Math.ceil(keepCount / 2)),
      ...chunks.slice(-Math.floor(keepCount / 2))
    ];

    // Store non-selected chunks for potential future retrieval
    for (let i = Math.ceil(keepCount / 2); i < totalChunks - Math.floor(keepCount / 2); i++) {
      await this.storeContext(chunks[i], sessionId, {
        chunkIndex: i,
        type: 'excluded_chunk'
      });
    }

    return selectedChunks;
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Fallback in-memory storage
  storeInMemory(content, sessionId, metadata) {
    if (!global.memoryStore) {
      global.memoryStore = new Map();
    }

    if (!global.memoryStore.has(sessionId)) {
      global.memoryStore.set(sessionId, []);
    }

    global.memoryStore.get(sessionId).push({
      content,
      metadata,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    });

    return { success: true, storage: 'memory' };
  }

  retrieveInMemory(sessionId, query) {
    if (!global.memoryStore || !global.memoryStore.has(sessionId)) {
      return [];
    }

    const memories = global.memoryStore.get(sessionId);

    if (!query) {
      return memories;
    }

    // Simple text search for in-memory fallback
    return memories.filter(memory =>
      memory.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  async enhanceWithPreviousContext(currentContent, sessionId, contextQuery = '') {
    const previousContext = await this.retrieveContext(sessionId, contextQuery, 3);

    if (previousContext.length === 0) {
      return currentContent;
    }

    const contextSummary = previousContext
      .map(ctx => ctx.content || ctx)
      .join('\n\nPrevious Context:\n');

    return `${contextSummary}\n\nCurrent Content:\n${currentContent}`;
  }
}

module.exports = ContextManager;
