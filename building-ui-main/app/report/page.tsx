import { redirect } from "next/navigation";

export default async function LegacyReportRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item));
    } else if (value !== undefined) {
      nextParams.set(key, value);
    }
  });
  nextParams.set("open_ai_report", "1");

  redirect(`/dashboard?${nextParams.toString()}`);
}
