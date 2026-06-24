import { differenceInCalendarDays, isBefore, startOfDay } from "date-fns";

export type ExpirationBucket = "expired" | "today" | "threeDays" | "sevenDays" | "safe";

export function getExpirationBucket(expirationDate?: Date | null): ExpirationBucket {
  if (!expirationDate) {
    return "safe";
  }

  const today = startOfDay(new Date());
  const target = startOfDay(expirationDate);

  if (isBefore(target, today)) {
    return "expired";
  }

  const diff = differenceInCalendarDays(target, today);

  if (diff === 0) {
    return "today";
  }

  if (diff <= 3) {
    return "threeDays";
  }

  if (diff <= 7) {
    return "sevenDays";
  }

  return "safe";
}

export function isExpiringSoonBucket(bucket: ExpirationBucket) {
  return bucket === "expired" || bucket === "today" || bucket === "threeDays" || bucket === "sevenDays";
}

export function getExpirationLabel(bucket: ExpirationBucket) {
  if (bucket === "expired") {
    return "Expired";
  }

  if (bucket === "today") {
    return "Expires today";
  }

  if (bucket === "threeDays") {
    return "Expires in 3 days";
  }

  if (bucket === "sevenDays") {
    return "Expires in 7 days";
  }

  return "Fresh";
}
