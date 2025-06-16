#!/usr/bin/env node

/**
 * Basic test script to verify the MCP server functionality
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Running basic MCP server tests...\n');

// Test 1: Check if server can start and show help
console.log('Test 1: Server help command');
const helpProcess = spawn('node', [join(__dirname, 'build/server/index.js'), '--help'], {
  stdio: 'pipe'
});

let helpOutput = '';
helpProcess.stdout.on('data', (data) => {
  helpOutput += data.toString();
});

helpProcess.on('close', (code) => {
  if (code === 0 && helpOutput.includes('Augment MCP Server')) {
    console.log('✅ Help command works correctly\n');
    
    // Test 2: Check if server can start briefly
    console.log('Test 2: Server startup test');
    const serverProcess = spawn('node', [join(__dirname, 'build/server/index.js')], {
      stdio: 'pipe'
    });
    
    let serverOutput = '';
    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });
    
    // Kill server after 2 seconds
    setTimeout(() => {
      serverProcess.kill('SIGTERM');
    }, 2000);
    
    serverProcess.on('close', (code) => {
      if (serverOutput.includes('Augment MCP Server started successfully')) {
        console.log('✅ Server starts and initializes correctly');
        console.log('✅ All basic tests passed!');
        console.log('\n🎉 MCP Server is working correctly!');
        console.log('\nNext steps:');
        console.log('1. Configure Claude Desktop to use this MCP server');
        console.log('2. Test the tools, resources, and prompts');
        console.log('3. Customize the configuration as needed');
      } else {
        console.log('❌ Server startup failed');
        console.log('Server output:', serverOutput);
        process.exit(1);
      }
    });
    
  } else {
    console.log('❌ Help command failed');
    console.log('Exit code:', code);
    console.log('Output:', helpOutput);
    process.exit(1);
  }
});

helpProcess.on('error', (error) => {
  console.log('❌ Failed to start help process:', error.message);
  process.exit(1);
});
