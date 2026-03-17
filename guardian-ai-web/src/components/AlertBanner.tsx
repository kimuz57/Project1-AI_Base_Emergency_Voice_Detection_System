"use client";

interface AlertBannerProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function AlertBanner({
  title,
  description,
  actionLabel = "ส่งความช่วยเหลือ",
  onAction,
}: AlertBannerProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-xl p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 alert-pulse deep-shadow">
      <div className="flex items-center gap-5">
        <div className="size-14 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 shrink-0">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            emergency
          </span>
        </div>
        <div>
          <h3 className="text-xl font-medium text-red-600 mb-0.5">{title}</h3>
          <p className="text-base text-red-600/80">{description}</p>
        </div>
      </div>
      <button
        onClick={onAction}
        className="bg-red-600 text-white px-8 py-3.5 rounded-2xl font-semibold transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20 active:scale-95 w-full md:w-auto"
      >
        {actionLabel}
      </button>
    </div>
  );
}
