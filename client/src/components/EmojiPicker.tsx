import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";

const emojiGroups = [
  { label: "تعبير", items: ["🙂", "😊", "🤍", "✨", "🌿", "🤲", "🌙", "⭐"] },
  { label: "تفاعل", items: ["👍", "👏", "💚", "💬", "📚", "🕌", "🧭", "☀️"] },
  { label: "تقدير", items: ["جزاك الله خيرًا", "ما شاء الله", "الحمد لله", "إن شاء الله"] },
];

type EmojiPickerProps = {
  onSelect: (value: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export default function EmojiPicker({ onSelect, disabled = false, label = "إضافة رمز تعبيري", className }: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={label}
          title={label}
          className={className || "h-9 w-9 rounded-xl text-[#467566] hover:bg-[#e8f1e7] hover:text-[#176047]"}
        >
          <SmilePlus size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="start" className="w-72 rounded-2xl border-[#dce6dc] bg-[#fbfcf8] p-3 shadow-xl">
        <p className="mb-2 text-xs font-extrabold text-[#315b4b]">أضف رمزًا أو عبارة لطيفة</p>
        {emojiGroups.map(group => (
          <div key={group.label} className="mb-3 last:mb-0">
            <p className="mb-1.5 text-[10px] font-bold text-[#82978c]">{group.label}</p>
            <div className="flex flex-wrap gap-1">
              {group.items.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[#e4f0e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b9578] ${item.length > 3 ? "text-xs font-semibold text-[#315b4b]" : "text-lg"}`}
                  aria-label={`إضافة ${item}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
