export interface DialCode {
  code: string;
  country: string;
  flag: string;
}

export const dialCodes: DialCode[] = [
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
];
