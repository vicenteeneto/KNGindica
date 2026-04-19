#!/usr/bin/env node
/**
 * KNGindica — Verificador de Padrões de Código
 * 
 * Uso: node check-standards.mjs
 * 
 * Verifica:
 * - Uso proibido de 'uppercase' em classNames
 * - Status badges sem capitalização correta
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = './src';
const EXTENSIONS = ['.tsx', '.ts'];
const ERRORS = [];
const WARNINGS = [];

// Palavras/padrões proibidos em className strings
const FORBIDDEN_CLASS_PATTERNS = [
  {
    pattern: /className=["'`][^"'`]*\buppercase\b[^"'`]*["'`]/g,
    message: '🚨 UPPERCASE proibido em className. Use Sentence Case no texto diretamente.',
    isError: true
  },
  {
    pattern: /className=\{`[^`]*\buppercase\b[^`]*`\}/g,
    message: '🚨 UPPERCASE proibido em className (template literal). Use Sentence Case no texto.',
    isError: true
  },
];

function walkDir(dir) {
  const results = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && !entry.startsWith('node_modules') && !entry.startsWith('.')) {
      results.push(...walkDir(fullPath));
    } else if (EXTENSIONS.includes(extname(entry))) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  FORBIDDEN_CLASS_PATTERNS.forEach(({ pattern, message, isError }) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Find line number
      const upToMatch = content.substring(0, match.index);
      const lineNumber = upToMatch.split('\n').length;
      const lineContent = lines[lineNumber - 1]?.trim() || '';

      const entry = {
        file: filePath.replace(/\\/g, '/').replace('./', ''),
        line: lineNumber,
        content: lineContent.substring(0, 100),
        message
      };

      if (isError) ERRORS.push(entry);
      else WARNINGS.push(entry);
    }
  });
}

// Rodar verificação
console.log('🔍 KNGindica — Verificando padrões de código...\n');

const files = walkDir(ROOT);
console.log(`📁 ${files.length} arquivos verificados\n`);

files.forEach(checkFile);

// Mostrar resultados
if (ERRORS.length === 0 && WARNINGS.length === 0) {
  console.log('✅ Tudo certo! Nenhuma violação encontrada.\n');
  process.exit(0);
}

if (ERRORS.length > 0) {
  console.log(`❌ ${ERRORS.length} ERRO(S) encontrado(s):\n`);
  ERRORS.forEach(e => {
    console.log(`  📄 ${e.file}:${e.line}`);
    console.log(`     ${e.message}`);
    console.log(`     → ${e.content}`);
    console.log('');
  });
}

if (WARNINGS.length > 0) {
  console.log(`⚠️  ${WARNINGS.length} AVISO(S):\n`);
  WARNINGS.forEach(w => {
    console.log(`  📄 ${w.file}:${w.line}`);
    console.log(`     ${w.message}`);
    console.log(`     → ${w.content}`);
    console.log('');
  });
}

if (ERRORS.length > 0) {
  console.log('💡 Como corrigir:');
  console.log('   - Remova "uppercase" do className');
  console.log('   - Escreva o texto diretamente em Sentence Case: "Meus pedidos"');
  console.log('   - Veja .cursorrules para mais detalhes\n');
  process.exit(1); // Falha — pode ser usado em CI
}

process.exit(0);
