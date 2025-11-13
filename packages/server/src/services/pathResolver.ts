import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * PathResolver - 解析 import 路徑到實際檔案系統路徑
 *
 * 功能：
 * - 解析相對路徑 (./, ../)
 * - 自動推斷檔案副檔名 (.ts, .tsx, .js, .jsx)
 * - 自動解析 index.ts 檔案
 * - 驗證路徑安全性（專案邊界檢查）
 */
export class PathResolver {
  private readonly projectPath: string;
  private readonly normalizedProjectPath: string;

  // 支援的副檔名，按優先順序排列
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx'];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    // 正規化專案路徑，解析符號連結（如果路徑存在）
    try {
      this.normalizedProjectPath = fs.realpathSync(projectPath);
    } catch {
      // 如果路徑不存在或無法解析，使用 resolve
      this.normalizedProjectPath = path.resolve(projectPath);
    }
  }

  /**
   * 解析 import 路徑到實際檔案路徑
   *
   * @param fromFile - 發起 import 的檔案路徑
   * @param importPath - import 語句中的路徑（如 './User', '../models/User'）
   * @returns 解析後的絕對路徑，如果無法解析則返回 null
   */
  async resolveImportPath(fromFile: string, importPath: string): Promise<string | null> {
    // 處理邊界條件
    if (!importPath || importPath.trim() === '') {
      return null;
    }

    // 只處理相對路徑
    if (!this.isRelativePath(importPath)) {
      return null;
    }

    // 確認 fromFile 在專案內
    if (!(await this.fileExists(fromFile))) {
      return null;
    }

    // 計算目標路徑
    const fromDir = path.dirname(fromFile);
    const targetPath = path.resolve(fromDir, importPath);

    // 正規化路徑（移除 ., .., 多餘的 /）
    const normalizedPath = path.normalize(targetPath);

    // 檢查是否在專案邊界內
    if (!this.isWithinProject(normalizedPath)) {
      return null;
    }

    // 嘗試解析檔案
    const resolved = await this.resolveFile(normalizedPath);

    return resolved;
  }

  /**
   * 判斷路徑是否為相對路徑
   */
  isRelativePath(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../');
  }

  /**
   * 判斷路徑是否在專案邊界內
   */
  isWithinProject(filePath: string): boolean {
    try {
      // 先正規化和解析相對路徑（. 和 ..）
      const resolvedPath = path.resolve(filePath);

      // 嘗試取得真實路徑（解析符號連結）
      // 如果路徑不存在，嘗試解析父目錄並拼接檔名
      let realPath: string;
      try {
        if (fs.existsSync(resolvedPath)) {
          realPath = fs.realpathSync(resolvedPath);
        } else {
          // 路徑不存在，遞歸向上查找存在的父目錄
          let currentPath = resolvedPath;
          const pathParts: string[] = [];

          while (!fs.existsSync(currentPath)) {
            pathParts.unshift(path.basename(currentPath));
            const parent = path.dirname(currentPath);
            if (parent === currentPath) {
              // 到達根目錄
              realPath = resolvedPath;
              break;
            }
            currentPath = parent;
          }

          if (fs.existsSync(currentPath)) {
            const realDir = fs.realpathSync(currentPath);
            realPath = path.join(realDir, ...pathParts);
          } else {
            realPath = resolvedPath;
          }
        }
      } catch {
        realPath = resolvedPath;
      }

      // 正規化兩個路徑並確保都以 / 結尾來進行比較
      const normalizedRealPath = realPath + (realPath.endsWith(path.sep) ? '' : path.sep);
      const normalizedProjectPath =
        this.normalizedProjectPath +
        (this.normalizedProjectPath.endsWith(path.sep) ? '' : path.sep);

      // 檢查是否以專案路徑開頭
      return normalizedRealPath.startsWith(normalizedProjectPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 解析檔案路徑，嘗試各種副檔名和 index 檔案
   *
   * @param basePath - 基礎路徑（可能沒有副檔名）
   * @returns 實際存在的檔案路徑，如果都不存在則返回 null
   */
  private async resolveFile(basePath: string): Promise<string | null> {
    // 1. 如果路徑已有副檔名且檔案存在，直接返回
    if (path.extname(basePath) && (await this.fileExists(basePath))) {
      return basePath;
    }

    // 2. 嘗試添加各種副檔名
    for (const ext of this.extensions) {
      const pathWithExt = basePath + ext;
      if (await this.fileExists(pathWithExt)) {
        return pathWithExt;
      }
    }

    // 3. 嘗試作為目錄，查找 index 檔案
    if (await this.directoryExists(basePath)) {
      for (const ext of this.extensions) {
        const indexPath = path.join(basePath, `index${ext}`);
        if (await this.fileExists(indexPath)) {
          return indexPath;
        }
      }
    }

    // 4. 無法解析
    return null;
  }

  /**
   * 檢查檔案是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * 檢查目錄是否存在
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}
