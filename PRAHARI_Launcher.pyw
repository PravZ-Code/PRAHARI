#!/usr/bin/env pythonw
"""
PRAHARI Defense Welfare Platform — Zero-Console Launcher Entry Point
Ministry of Home Affairs / Central Reserve Police Force (CRPF)

Executes launcher.py strictly using pythonw with 100% zero terminal popups.
Double-clicking this file in Windows Explorer launches the PRAHARI GUI directly.
"""
import os
import sys

# Ensure current working directory is the prahari repository root
current_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(current_dir)
sys.path.insert(0, current_dir)

import launcher

if __name__ == "__main__":
    launcher.main()
