"use client";

import { motion } from "framer-motion";
import React from "react";
import type { ScreenWidget } from "./WidgetCard";
import { WidgetCard } from "./WidgetCard";


export interface ThoughtPartnerCardProps {
  widget: ScreenWidget;
}

export const ThoughtPartnerCard: React.FC<ThoughtPartnerCardProps> = ({
  widget,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-full overflow-hidden"
    >
      {/* Widget Card Container */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden p-3">
      <WidgetCard widget={widget} />
      </div>
    </motion.div>
  );
};

export default ThoughtPartnerCard;
