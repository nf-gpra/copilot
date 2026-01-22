"use client";

import { useState } from "react";

interface FileUploadOptionsCardProps {
  fileName: string;
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
}

export default function FileUploadOptionsCard({
  fileName,
  status,
  respond,
}: FileUploadOptionsCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const options = [
    {
      id: "keep",
      icon: "💾",
      title: "just keep it",
      description: "Store the file without any immediate analysis",
    },
    {
      id: "analyze",
      icon: "🧠",
      title: "keep it and analyse",
      description: "Store the file and get insights immediately",
    },
    {
      id: "custom",
      icon: "🔧",
      title: "custom",
      description: "Describe what you want to do with this data",
    },
  ];

  const handleOptionSelect = (optionId: string, optionTitle: string) => {
    setSelectedOption(optionId);
    const responseMessage = `User selected: "${optionTitle}" for the uploaded file "${fileName}".`;
    respond?.(responseMessage);
  };

  const handleCancel = () => {
    setSelectedOption("cancelled");
    respond?.(
      `User cancelled the file analysis for "${fileName}". Ask the user what they would like to do instead.`
    );
  };

  return (
    <div className="rounded-2xl shadow-xl max-w-md w-full mt-4 bg-gradient-to-br from-blue-500 to-indigo-600">
      <div className="bg-white/10 backdrop-blur-md p-6 w-full rounded-2xl">
        {/* Show selected option result */}
        {selectedOption && selectedOption !== "cancelled" ? (
          <div className="text-center">
            <div className="text-5xl mb-3">
              {options.find((o) => o.id === selectedOption)?.icon || "✅"}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {options.find((o) => o.id === selectedOption)?.title}
            </h2>
            <p className="text-white/80 text-sm">
              Processing <span className="font-semibold">{fileName}</span>...
            </p>
          </div>
        ) : selectedOption === "cancelled" ? (
          <div className="text-center">
            <div className="text-5xl mb-3">❌</div>
            <h2 className="text-xl font-bold text-white mb-2">Cancelled</h2>
            <p className="text-white/80 text-sm">
              File analysis was cancelled.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">📁</div>
              <h2 className="text-lg font-bold text-white mb-1">
                File Uploaded
              </h2>
              <p className="text-white/80 text-sm truncate px-4">{fileName}</p>
            </div>

            {/* Question */}
            <p className="text-white/90 text-center text-sm mb-4">
              What would you like to do with this file?
            </p>

            {/* Options Grid */}
            {status === "executing" && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() =>
                        handleOptionSelect(option.id, option.title)
                      }
                      className="flex flex-col items-center p-3 rounded-xl bg-white/20 hover:bg-white/30
                        transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
                    >
                      <span className="text-2xl mb-1">{option.icon}</span>
                      <span className="text-white font-semibold text-sm">
                        {option.title}
                      </span>
                      <span className="text-white/70 text-[10px] leading-tight mt-1">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Cancel Button */}
                <button
                  onClick={handleCancel}
                  className="w-full py-2 rounded-xl bg-black/20 text-white/80 text-sm font-medium
                    border border-white/20 hover:bg-black/30 transition-all"
                >
                  Cancel
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
