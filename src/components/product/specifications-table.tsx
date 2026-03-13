type SpecificationsTableProps = {
  specs: Record<string, string>;
};

export function SpecificationsTable({ specs }: SpecificationsTableProps) {
  const entries = Object.entries(specs);

  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-sand">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([key, value], index) => (
            <tr
              key={key}
              className={index % 2 === 0 ? "bg-white" : "bg-warm-white"}
            >
              <td className="w-2/5 px-4 py-3 font-semibold text-charcoal">
                {key}
              </td>
              <td className="px-4 py-3 text-charcoal/70">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
