import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

interface PackageInfo {
  version: string;
  description: string;
}

export async function getPackageInfo(): Promise<PackageInfo> {
  try {
    // Get the directory of the current module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Read package.json from the CLI package root
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    return {
      version: packageJson.version || '1.0.0',
      description:
        packageJson.description ||
        'Goose Code Review Tool - AI-assisted code review tool running locally',
    };
  } catch (error) {
    // Fallback to default values if reading fails
    return {
      version: '1.0.0',
      description: 'Goose Code Review Tool - AI-assisted code review tool running locally',
    };
  }
}
