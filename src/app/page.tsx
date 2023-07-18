import ClientForms from "./ClientForms";

export default function Page() {
  return (
    <>
      <div className="text-center text-2xl font-serif p-10 w-full bg-zinc-300 dark:bg-slate-800">
        Caroline&apos;s Color Combinator
      </div>
      <ClientForms />
    </>
  );
}
