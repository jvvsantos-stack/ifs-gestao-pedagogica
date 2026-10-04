import os
import re

dir_path = "src/components"

def fix_all_selects_regex():
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                
                # Replace in AnalisesView and others
                # <select className="... bg-transparent dark:bg-slate-800 ..." ...>
                # Let's just find any `<select ` and make sure it has dark:bg-slate-800, dark:border-slate-700, dark:text-slate-100
                
                # A safer approach for the specific classes in AnalisesView:
                content = content.replace(
                    "text-sm font-bold text-gray-800 dark:text-slate-200 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer max-w-[150px] truncate",
                    "text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer max-w-[150px] truncate"
                )
                
                content = content.replace(
                    "text-sm font-bold text-gray-800 dark:text-slate-200 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer disabled:opacity-60",
                    "text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer disabled:opacity-60"
                )
                
                content = content.replace(
                    "text-sm font-bold text-gray-800 dark:text-slate-200 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer max-w-[120px] truncate",
                    "text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer max-w-[120px] truncate"
                )
                
                content = content.replace(
                    "text-sm font-bold text-gray-800 dark:text-slate-200 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer",
                    "text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none cursor-pointer"
                )

                if content != original:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated selects regex in {filepath}")

if __name__ == "__main__":
    fix_all_selects_regex()
