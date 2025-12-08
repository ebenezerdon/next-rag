import fs from 'fs';
import path from 'path';

interface VectorEntry {
  id: string;
  vector: number[];
  metadata: any;
}

export class SimpleVectorStore {
  private filePath: string;
  private data: VectorEntry[] = [];

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async upsert(vectors: number[][], metadata: any[], ids: string[]) {
    for (let i = 0; i < vectors.length; i++) {
      const id = ids[i];
      const vector = vectors[i];
      const meta = metadata[i];

      const existingIndex = this.data.findIndex(item => item.id === id);
      if (existingIndex >= 0) {
        this.data[existingIndex] = { id, vector, metadata: meta };
      } else {
        this.data.push({ id, vector, metadata: meta });
      }
    }
    this.save();
  }

  async query(queryVector: number[], topK: number = 5) {
    const scored = this.data.map(item => ({
      ...item,
      score: this.cosineSimilarity(queryVector, item.vector),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
