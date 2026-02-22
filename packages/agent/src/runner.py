#!/usr/bin/env python3
"""
MyCluster Python Script Runner
Executes a Python script and returns results in JSON format.

Usage:
    python runner.py --script "print('hello')" --output-dir /tmp/results
    python runner.py --script-file script.py --output-dir /tmp/results --timeout 60
"""

import argparse
import json
import os
import sys
import traceback
import io
import base64
import tempfile
import shutil
from datetime import datetime
from pathlib import Path


def execute_script(script: str = None, script_file: str = None, 
                   output_dir: str = None, timeout: int = 300,
                   args: dict = None):
    """
    Execute a Python script and capture results.
    
    Args:
        script: Python code to execute (inline)
        script_file: Path to Python script file
        output_dir: Directory to save output files
        timeout: Maximum execution time in seconds
        args: Additional arguments to pass to script
    
    Returns:
        dict: Result containing stdout, stderr, exit_code, and any output files
    """
    start_time = datetime.now()
    result = {
        "stdout": "",
        "stderr": "",
        "exit_code": 0,
        "files": [],
        "start_time": start_time.isoformat(),
        "end_time": None,
        "duration_ms": 0,
        "error": None
    }
    
    # Create output directory if needed
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    # Redirect stdout/stderr to capture output
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    
    try:
        sys.stdout = stdout_capture
        sys.stderr = stderr_capture
        
        # Determine script source
        if script:
            script_source = script
        elif script_file:
            with open(script_file, 'r', encoding='utf-8') as f:
                script_source = f.read()
        else:
            raise ValueError("Either --script or --script-file must be provided")
        
        # Create execution environment
        exec_globals = {
            '__name__': '__main__',
            '__file__': script_file or '<inline>',
            'args': args or {},
            'output_dir': output_dir,
        }
        
        # Execute with timeout (simplified - real timeout would use multiprocessing)
        exec(script_source, exec_globals)
        result["exit_code"] = 0
        
    except SystemExit as e:
        result["exit_code"] = e.code if isinstance(e.code, int) else 1
    except Exception as e:
        result["exit_code"] = -1
        result["error"] = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
    finally:
        # Restore stdout/stderr
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        
        # Capture output
        result["stdout"] = stdout_capture.getvalue()
        result["stderr"] = stderr_capture.getvalue()
    
    # Calculate duration
    end_time = datetime.now()
    result["end_time"] = end_time.isoformat()
    result["duration_ms"] = int((end_time - start_time).total_seconds() * 1000)
    
    # Scan for output files
    if output_dir and os.path.exists(output_dir):
        for root, dirs, files in os.walk(output_dir):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, output_dir)
                
                # Determine file type
                ext = os.path.splitext(file)[1].lower()
                file_type = "binary"
                if ext in ['.txt', '.json', '.csv', '.md', '.log']:
                    file_type = "text"
                elif ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']:
                    file_type = "image"
                elif ext in ['.mp4', '.avi', '.mkv', '.webm', '.mov']:
                    file_type = "video"
                elif ext in ['.mp3', '.wav', '.ogg', '.flac', '.aac']:
                    file_type = "audio"
                
                file_info = {
                    "path": rel_path,
                    "type": file_type,
                    "size": os.path.getsize(file_path)
                }
                
                # For text files, include content inline
                if file_type == "text":
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            file_info["content"] = f.read()
                    except:
                        pass
                # For images, include base64 preview (first 1MB max)
                elif file_type == "image":
                    try:
                        with open(file_path, 'rb') as f:
                            content = f.read(1024 * 1024)  # Max 1MB
                            file_info["preview_base64"] = base64.b64encode(content).decode('utf-8')
                    except:
                        pass
                
                result["files"].append(file_info)
    
    return result


def main():
    parser = argparse.ArgumentParser(description='MyCluster Python Script Runner')
    parser.add_argument('--script', type=str, help='Python code to execute (inline)')
    parser.add_argument('--script-file', type=str, help='Path to Python script file')
    parser.add_argument('--output-dir', type=str, default=None, 
                        help='Directory to save output files')
    parser.add_argument('--timeout', type=int, default=300, 
                        help='Maximum execution time in seconds')
    parser.add_argument('--args', type=str, default='{}',
                        help='JSON string of arguments to pass to script')
    parser.add_argument('--output-json', action='store_true',
                        help='Output result as JSON (default)')
    
    args = parser.parse_args()
    
    # Parse additional args
    try:
        script_args = json.loads(args.args)
    except json.JSONDecodeError:
        script_args = {}
    
    # Execute script
    result = execute_script(
        script=args.script,
        script_file=args.script_file,
        output_dir=args.output_dir,
        timeout=args.timeout,
        args=script_args
    )
    
    # Output result
    if args.output_json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Exit code: {result['exit_code']}")
        print(f"Duration: {result['duration_ms']}ms")
        if result['stdout']:
            print(f"\n--- STDOUT ---\n{result['stdout']}")
        if result['stderr']:
            print(f"\n--- STDERR ---\n{result['stderr']}")
        if result['error']:
            print(f"\n--- ERROR ---\n{result['error']}")
        if result['files']:
            print(f"\n--- OUTPUT FILES ({len(result['files'])}) ---")
            for f in result['files']:
                print(f"  [{f['type']}] {f['path']} ({f['size']} bytes)")
    
    sys.exit(result['exit_code'] if result['exit_code'] != 0 else 0)


if __name__ == '__main__':
    main()
