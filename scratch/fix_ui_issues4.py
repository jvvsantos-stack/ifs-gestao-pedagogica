import os

def fix_top5():
    filepath = "src/components/AnalisesView.tsx"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(
        "className=\"font-black text-red-500\"",
        "className=\"font-black text-red-500 dark:text-red-400\""
    )
    content = content.replace(
        "className=\"font-black text-emerald-500\"",
        "className=\"font-black text-emerald-500 dark:text-emerald-400\""
    )
    
    # Risco Academico icon
    content = content.replace(
        "<div className=\"p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600\">",
        "<div className=\"p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400\">"
    )
    
    # Top 5 Gargalos icon
    content = content.replace(
        "<div className=\"p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500\">",
        "<div className=\"p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400\">"
    )
    
    # Top 5 Melhores icon
    content = content.replace(
        "<div className=\"p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-500\">",
        "<div className=\"p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-500 dark:text-emerald-400\">"
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated Top 5 in {filepath}")

if __name__ == "__main__":
    fix_top5()
