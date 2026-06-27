"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark);
    }, [isDark]);

    const toggleTheme = () => {
        setIsDark(!isDark);
    };

    return (
        <button
            onClick={toggleTheme}
            className={`relative w-14 h-8 rounded-full transition-all duration-300 ${isDark ? "bg-indigo-500" : "bg-gray-300"
                }`}
        >
            <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 flex items-center justify-center ${isDark ? "left-7" : "left-1"
                    }`}
            >
                {isDark ? "🌙" : "☀️"}
            </span>
        </button>
    );
}