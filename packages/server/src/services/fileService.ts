import fs from 'fs-extra';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB per chunk

export interface FileChunk {
  content: string;
  offset: number;
  totalSize: number;
  hasMore: boolean;
  isLargeFile: boolean;
}

export class FileService {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async readFile(relativePath: string): Promise<string> {
    // Security check: prevent path traversal attack
    const normalizedPath = path.normalize(relativePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      throw new Error('Invalid file path');
    }

    const fullPath = path.join(this.projectPath, relativePath);

    // Check if file exists
    if (!(await fs.pathExists(fullPath))) {
      throw new Error('File does not exist');
    }

    // Check if it's a file
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }

    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large (exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB), please use chunked loading`
      );
    }

    // Read file content
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  }

  /**
   * Read file in chunks
   * @param relativePath File relative path
   * @param offset Start position (bytes)
   * @param chunkSize Size to read per chunk (bytes), default 1MB
   */
  async readFileChunk(
    relativePath: string,
    offset: number = 0,
    chunkSize: number = CHUNK_SIZE
  ): Promise<FileChunk> {
    // Security check: prevent path traversal attack
    const normalizedPath = path.normalize(relativePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      throw new Error('Invalid file path');
    }

    const fullPath = path.join(this.projectPath, relativePath);

    // Check if file exists
    if (!(await fs.pathExists(fullPath))) {
      throw new Error('File does not exist');
    }

    // Check if it's a file
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }

    const totalSize = stats.size;
    const isLargeFile = totalSize > MAX_FILE_SIZE;

    // Calculate actual read size
    const bytesToRead = Math.min(chunkSize, totalSize - offset);

    if (bytesToRead <= 0) {
      return {
        content: '',
        offset: totalSize,
        totalSize,
        hasMore: false,
        isLargeFile,
      };
    }

    // Read content of specified range
    const buffer = Buffer.alloc(bytesToRead);
    const fd = await fs.open(fullPath, 'r');

    try {
      await fs.read(fd, buffer, 0, bytesToRead, offset);
      const content = buffer.toString('utf-8');

      return {
        content,
        offset: offset + bytesToRead,
        totalSize,
        hasMore: offset + bytesToRead < totalSize,
        isLargeFile,
      };
    } finally {
      await fs.close(fd);
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(relativePath: string): Promise<{ size: number; isLargeFile: boolean }> {
    const normalizedPath = path.normalize(relativePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      throw new Error('Invalid file path');
    }

    const fullPath = path.join(this.projectPath, relativePath);

    if (!(await fs.pathExists(fullPath))) {
      throw new Error('File does not exist');
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }

    return {
      size: stats.size,
      isLargeFile: stats.size > MAX_FILE_SIZE,
    };
  }
}
