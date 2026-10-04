import os

def soften_kpicards():
    filepath = "src/components/AnalisesView.tsx"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Soften KPICards iconBg classes
    content = content.replace(
        "iconBg=\"bg-blue-50 dark:bg-blue-900/20 text-blue-600\"",
        "iconBg=\"bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400\""
    )
    content = content.replace(
        "iconBg=\"bg-purple-50 text-purple-600\"",
        "iconBg=\"bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400\""
    )
    content = content.replace(
        "iconBg=\"bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600\"",
        "iconBg=\"bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400\""
    )
    content = content.replace(
        "iconBg=\"bg-orange-50 dark:bg-orange-900/20 text-orange-600\"",
        "iconBg=\"bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400\""
    )
    content = content.replace(
        "iconBg=\"bg-red-50 dark:bg-red-900/20 text-red-600\"",
        "iconBg=\"bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400\""
    )
    content = content.replace(
        "iconBg=\"bg-amber-50 dark:bg-amber-900/20 text-amber-600\"",
        "iconBg=\"bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400\""
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated KPICards in {filepath}")

if __name__ == "__main__":
    soften_kpicards()
