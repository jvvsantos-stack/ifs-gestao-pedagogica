import os
import re

def fix_consolidacao():
    filepath = "src/components/ConsolidacaoView.tsx"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Soften badges
    content = content.replace(
        "className={nota >= 6.0 ? 'text-green-600' : 'text-red-600'}",
        "className={nota >= 6.0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}"
    )
    
    content = content.replace(
        "className=\"text-amber-600 font-bold\"",
        "className=\"text-amber-600 dark:text-amber-400 font-bold\""
    )
    
    content = content.replace(
        "className=\"text-green-600 font-bold\"",
        "className=\"text-green-600 dark:text-green-400 font-bold\""
    )
    
    content = content.replace(
        "className=\"text-red-600 font-bold\"",
        "className=\"text-red-600 dark:text-red-400 font-bold\""
    )
    
    content = content.replace(
        "<span className=\"text-red-600\">{item.statusText}</span>",
        "<span className=\"text-red-600 dark:text-red-400\">{item.statusText}</span>"
    )
    
    content = content.replace(
        "className=\"text-red-500 font-medium\"",
        "className=\"text-red-500 dark:text-red-400 font-medium\""
    )
    
    content = content.replace(
        "className=\"px-4 py-3 text-center align-middle font-bold text-green-600\"",
        "className=\"px-4 py-3 text-center align-middle font-bold text-green-600 dark:text-green-400\""
    )
    
    content = content.replace(
        "className=\"px-4 py-3 text-center align-middle font-bold text-indigo-600\"",
        "className=\"px-4 py-3 text-center align-middle font-bold text-indigo-600 dark:text-indigo-400\""
    )
    
    # Fix the missing dark:text-slate-200 in the Risco table is actually in AnalisesView.tsx

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

def fix_analises():
    filepath = "src/components/AnalisesView.tsx"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Risco Academico table row texts
    content = content.replace(
        "<td className=\"py-2.5 px-3 text-gray-500 dark:text-slate-400 truncate max-w-[80px]\">{r.turma}</td>",
        "<td className=\"py-2.5 px-3 font-medium text-gray-800 dark:text-slate-200 truncate max-w-[80px]\">{r.turma}</td>"
    )
    
    # But wait, the name is already: className="py-2.5 px-3 font-bold text-gray-700 dark:text-slate-300 truncate max-w-[120px]"
    content = content.replace(
        "text-gray-700 dark:text-slate-300 truncate max-w-[120px]",
        "text-gray-900 dark:text-slate-100 truncate max-w-[120px]"
    )
    
    # Red badge in AnalisesView (already has dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800, maybe we soften it more or fix others?)
    # "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800 font-bold px-2 py-0.5 rounded-full text-[10px]" - this is already softened. 
    # What about the others?

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")


def fix_all_selects():
    dir_path = "src/components"
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                
                # TurmasView, EstagiosView top filter selects
                content = content.replace(
                    "text-sm font-bold text-gray-800 dark:text-slate-200 bg-transparent outline-none",
                    "text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none"
                )
                
                # ConsolidacaoView selects
                content = content.replace(
                    "className=\"text-sm font-bold text-gray-800 dark:text-slate-200 bg-transparent outline-none",
                    "className=\"text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-600 outline-none"
                )

                if content != original:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated selects in {filepath}")

if __name__ == "__main__":
    fix_consolidacao()
    fix_analises()
    fix_all_selects()
