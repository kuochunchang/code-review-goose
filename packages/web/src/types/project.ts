export interface ProjectInfo {
  name: string;
  path: string;
  fileCount: number;
  totalSize: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}
