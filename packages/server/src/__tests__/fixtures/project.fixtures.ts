/**
 * 基础项目信息
 */
export const mockProjectInfo = {
  name: 'test-project',
  path: '/test/project',
  fileCount: 42,
  totalSize: 1048576, // 1MB
  languages: ['TypeScript', 'JavaScript', 'Vue'],
};

/**
 * 大型项目信息
 */
export const mockLargeProjectInfo = {
  name: 'large-monorepo',
  path: '/test/large-project',
  fileCount: 5432,
  totalSize: 104857600, // 100MB
  languages: ['TypeScript', 'JavaScript', 'Vue', 'Python', 'Go'],
};

/**
 * 小型项目信息
 */
export const mockSmallProjectInfo = {
  name: 'small-lib',
  path: '/test/small-project',
  fileCount: 8,
  totalSize: 51200, // 50KB
  languages: ['TypeScript'],
};

/**
 * 文件树 - 基础结构
 */
export const mockFileTree = {
  name: 'project',
  path: '/test/project',
  type: 'directory',
  children: [
    {
      name: 'src',
      path: '/test/project/src',
      type: 'directory',
      children: [
        {
          name: 'index.ts',
          path: '/test/project/src/index.ts',
          type: 'file',
          size: 1024,
        },
        {
          name: 'utils.ts',
          path: '/test/project/src/utils.ts',
          type: 'file',
          size: 512,
        },
        {
          name: 'components',
          path: '/test/project/src/components',
          type: 'directory',
          children: [
            {
              name: 'Button.vue',
              path: '/test/project/src/components/Button.vue',
              type: 'file',
              size: 2048,
            },
          ],
        },
      ],
    },
    {
      name: 'package.json',
      path: '/test/project/package.json',
      type: 'file',
      size: 512,
    },
    {
      name: 'README.md',
      path: '/test/project/README.md',
      type: 'file',
      size: 256,
    },
  ],
};

/**
 * 简单的文件树（扁平结构）
 */
export const mockFlatFileTree = {
  name: 'simple-project',
  path: '/test/simple',
  type: 'directory',
  children: [
    {
      name: 'index.js',
      path: '/test/simple/index.js',
      type: 'file',
      size: 256,
    },
    {
      name: 'utils.js',
      path: '/test/simple/utils.js',
      type: 'file',
      size: 128,
    },
    {
      name: 'package.json',
      path: '/test/simple/package.json',
      type: 'file',
      size: 512,
    },
  ],
};

/**
 * 嵌套深度的文件树
 */
export const mockDeepFileTree = {
  name: 'deep-project',
  path: '/test/deep',
  type: 'directory',
  children: [
    {
      name: 'level1',
      path: '/test/deep/level1',
      type: 'directory',
      children: [
        {
          name: 'level2',
          path: '/test/deep/level1/level2',
          type: 'directory',
          children: [
            {
              name: 'level3',
              path: '/test/deep/level1/level2/level3',
              type: 'directory',
              children: [
                {
                  name: 'deep-file.ts',
                  path: '/test/deep/level1/level2/level3/deep-file.ts',
                  type: 'file',
                  size: 1024,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/**
 * 空项目
 */
export const mockEmptyProject = {
  name: 'empty-project',
  path: '/test/empty',
  type: 'directory',
  children: [],
};
