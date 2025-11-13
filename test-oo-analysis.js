#!/usr/bin/env node
/**
 * OO Dependency Analysis Test Script
 * Usage: node test-oo-analysis.js
 */

import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { OOAnalysisService } from './packages/server/dist/services/ooAnalysisService.js';

// Read test file
const testFile = './test-oo-relationships.ts';
const code = readFileSync(testFile, 'utf-8');

// Parse into AST
const ast = parse(code, {
  sourceType: 'module',
  plugins: [
    'typescript',
    'jsx',
    'decorators-legacy',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
  ],
});

// Create OO analysis service
const service = new OOAnalysisService();

// Extract imports
console.log('='.repeat(80));
console.log('📦 IMPORT Analysis');
console.log('='.repeat(80));
const imports = service.extractImports(ast);
imports.forEach((imp, idx) => {
  console.log(`\n${idx + 1}. Source: ${imp.source}`);
  console.log(`   Specifiers: ${imp.specifiers.join(', ')}`);
  console.log(`   Type: ${imp.isDefault ? 'Default' : imp.isNamespace ? 'Namespace' : 'Named'}`);
  if (imp.isTypeOnly) console.log(`   Type-only import`);
});

// Extract exports
console.log('\n' + '='.repeat(80));
console.log('📤 EXPORT Analysis');
console.log('='.repeat(80));
const exports = service.extractExports(ast);
exports.forEach((exp, idx) => {
  console.log(`\n${idx + 1}. Name: ${exp.name}`);
  console.log(`   Type: ${exp.exportType}`);
  console.log(`   Default: ${exp.isDefault}`);
  if (exp.isReExport) console.log(`   Re-export from: ${exp.source}`);
});

// Simplified class extraction (for testing)
const classes = [];
function extractClassesSimple(node) {
  if (node.type === 'ClassDeclaration' && node.id) {
    const classInfo = {
      name: node.id.name,
      type: 'class',
      properties: [],
      methods: [],
      constructorParams: [],
    };

    // Extract properties
    node.body.body.forEach((member) => {
      if (member.type === 'ClassProperty' && member.key.type === 'Identifier') {
        const visibility = member.accessibility || (member.key.name.startsWith('#') ? 'private' : 'public');
        let type = 'any';
        let isArray = false;

        if (member.typeAnnotation?.typeAnnotation) {
          const typeNode = member.typeAnnotation.typeAnnotation;
          if (typeNode.type === 'TSTypeReference' && typeNode.typeName.type === 'Identifier') {
            type = typeNode.typeName.name;
          } else if (typeNode.type === 'TSArrayType') {
            isArray = true;
            if (typeNode.elementType.type === 'TSTypeReference') {
              type = `${typeNode.elementType.typeName.name}[]`;  // Add [] suffix
            } else {
              type = 'Array';
            }
          }
        }

        // Remove [] suffix to determine base type
        const baseType = type.replace(/\[\]/g, '');
        const isClassType = baseType && baseType[0] === baseType[0].toUpperCase() &&
                           !['String', 'Number', 'Boolean', 'Array'].includes(baseType);

        classInfo.properties.push({
          name: member.key.name,
          type,
          visibility,
          isArray,
          isClassType,
          lineNumber: member.loc?.start.line,
        });
      } else if (member.type === 'ClassMethod' && member.key.type === 'Identifier') {
        const visibility = member.accessibility || 'public';
        const parameters = (member.params || []).map((param) => {
          let paramType = 'any';
          if (param.typeAnnotation?.typeAnnotation) {
            const typeNode = param.typeAnnotation.typeAnnotation;
            if (typeNode.type === 'TSTypeReference' && typeNode.typeName?.type === 'Identifier') {
              paramType = typeNode.typeName.name;
            }
          }
          return {
            name: param.name || (param.left?.name) || 'param',
            type: paramType,
          };
        });

        let returnType = 'void';
        if (member.returnType?.typeAnnotation) {
          const typeNode = member.returnType.typeAnnotation;
          if (typeNode.type === 'TSTypeReference' && typeNode.typeName?.type === 'Identifier') {
            returnType = typeNode.typeName.name;
          }
        }

        if (member.kind === 'constructor') {
          classInfo.constructorParams = parameters;
        }

        classInfo.methods.push({
          name: member.key.name,
          parameters,
          returnType,
          visibility,
          lineNumber: member.loc?.start.line,
        });
      }
    });

    // Extract inheritance
    if (node.superClass?.type === 'Identifier') {
      classInfo.extends = node.superClass.name;
    }

    // Extract interface implementations
    if (node.implements && node.implements.length > 0) {
      classInfo.implements = node.implements
        .filter((impl) => impl.expression?.type === 'Identifier')
        .map((impl) => impl.expression.name);
    }

    classes.push(classInfo);
  }

  // Recursively process child nodes
  for (const key in node) {
    const child = node[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        child.forEach((c) => {
          if (c && typeof c === 'object' && c.type) {
            extractClassesSimple(c);
          }
        });
      } else if (child.type) {
        extractClassesSimple(child);
      }
    }
  }
}

extractClassesSimple(ast.program);

console.log('\n' + '='.repeat(80));
console.log('🏗️  Class Structure');
console.log('='.repeat(80));
classes.forEach((cls) => {
  console.log(`\n📦 ${cls.name}`);
  if (cls.extends) console.log(`   ├─ Extends: ${cls.extends}`);
  if (cls.implements) console.log(`   ├─ Implements: ${cls.implements.join(', ')}`);
  console.log(`   ├─ Properties: ${cls.properties.length}`);
  console.log(`   ├─ Methods: ${cls.methods.length}`);
  console.log(`   └─ Constructor params: ${cls.constructorParams.length}`);
});

// OO relationship analysis
console.log('\n' + '='.repeat(80));
console.log('🔗 OO Relationship Analysis');
console.log('='.repeat(80));

const ooAnalysis = service.analyze(classes, imports);

// Composition
console.log('\n💎 Composition (solid diamond ◆):');
ooAnalysis.compositions.forEach((dep, idx) => {
  console.log(`${idx + 1}. ${dep.from} *-- "${dep.cardinality}" ${dep.to} : ${dep.context}`);
  console.log(`   └─ Line ${dep.lineNumber}`);
});

// Aggregation
console.log('\n◇ Aggregation (hollow diamond ◇):');
ooAnalysis.aggregations.forEach((dep, idx) => {
  console.log(`${idx + 1}. ${dep.from} o-- "${dep.cardinality}" ${dep.to} : ${dep.context}`);
  console.log(`   └─ Line ${dep.lineNumber}`);
});

// Association
console.log('\n→ Association (solid arrow):');
ooAnalysis.associations.forEach((dep, idx) => {
  console.log(`${idx + 1}. ${dep.from} --> "${dep.cardinality}" ${dep.to} : ${dep.context}`);
  console.log(`   └─ Line ${dep.lineNumber}`);
});

// Dependency
console.log('\n··> Dependency (dashed arrow):');
ooAnalysis.dependencies.forEach((dep, idx) => {
  console.log(`${idx + 1}. ${dep.from} ..> ${dep.to}`);
  console.log(`   └─ ${dep.context} (Line ${dep.lineNumber})`);
});

// Injection
console.log('\n💉 Dependency Injection:');
ooAnalysis.injections.forEach((dep, idx) => {
  console.log(`${idx + 1}. ${dep.from} ..> ${dep.to} : <<inject>>`);
  console.log(`   └─ ${dep.context} (Line ${dep.lineNumber})`);
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 Statistical Summary');
console.log('='.repeat(80));
console.log(`Classes: ${classes.length}`);
console.log(`Imports: ${imports.length}`);
console.log(`Exports: ${exports.length}`);
console.log(`Total Relationships: ${ooAnalysis.relationships.length}`);
console.log(`  ├─ Compositions: ${ooAnalysis.compositions.length}`);
console.log(`  ├─ Aggregations: ${ooAnalysis.aggregations.length}`);
console.log(`  ├─ Associations: ${ooAnalysis.associations.length}`);
console.log(`  ├─ Dependencies: ${ooAnalysis.dependencies.length}`);
console.log(`  └─ Injections: ${ooAnalysis.injections.length}`);

console.log('\n' + '='.repeat(80));
console.log('✅ Analysis Complete!');
console.log('='.repeat(80));
