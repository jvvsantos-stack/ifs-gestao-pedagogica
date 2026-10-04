import os
import re

dir_path = "src/components"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = content
    
    # CadastrosView inputs
    new_content = new_content.replace(
        "className=\"w-full text-sm border border-gray-300 dark:border-slate-600 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none\"",
        "className=\"w-full text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-600 rounded p-2 focus:ring-1 focus:ring-indigo-500 outline-none\""
    )
    
    # BuscaAlunoModal
    new_content = new_content.replace(
        "className=\"w-full text-sm border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none\"",
        "className=\"w-full text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none\""
    )
    
    # ConsolidacaoView select
    new_content = new_content.replace(
        "className=\"block w-64 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border\"",
        "className=\"block w-64 rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border\""
    )
    
    # TurmasView input
    new_content = new_content.replace(
        "className=\"className=\"w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-6 dark:focus:ring-slate-600 dark:border-slate-700 dark:text-slate-100 dark:bg-slate-800\"\"",
        "className=\"w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-600 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-6\""
    )
    
    # other general
    new_content = new_content.replace(
        "className=\"w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500\"",
        "className=\"w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500\""
    )

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
