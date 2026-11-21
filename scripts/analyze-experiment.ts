import { zTest } from "../src/lib/analysis.ts";

interface Event {
  experiment: string;
  variant: string;
  type: "exposure" | "select";
}

const experiments = [
  {
    key: "tile-size",
    variants: [
      { name: "standard", exposure: 500, conversionRate: 0.18 },
      { name: "large", exposure: 500, conversionRate: 0.20 },
    ],
  },
  {
    key: "preview-delay",
    variants: [
      { name: "preview-400", exposure: 500, conversionRate: 0.16 },
      { name: "preview-1200", exposure: 500, conversionRate: 0.14 },
    ],
  },
] as const;

function syntheticEvents(): Event[] {
  const events: Event[] = [];
  for (const experiment of experiments) {
    for (const variant of experiment.variants) {
      for (let index = 0; index < variant.exposure; index += 1) {
        events.push({
          experiment: experiment.key,
          variant: variant.name,
          type: "exposure",
        });
        if (
          ((index * 37 + variant.name.length * 13) % 1000) / 1000 <
          variant.conversionRate
        ) {
          events.push({
            experiment: experiment.key,
            variant: variant.name,
            type: "select",
          });
        }
      }
    }
  }
  return events;
}

function summarize(experimentKey: string): void {
  const events = syntheticEvents();
  const eventVariants = experiments.find(
    (experiment) => experiment.key === experimentKey,
  )?.variants;
  if (!eventVariants) {
    throw new Error(`Unknown experiment: ${experimentKey}`);
  }

  const totals = eventVariants.map((variant) => {
    const exposures = events.filter(
      (event) =>
        event.experiment === experimentKey &&
        event.variant === variant.name &&
        event.type === "exposure",
    ).length;
    const conversions = events.filter(
      (event) =>
        event.experiment === experimentKey &&
        event.variant === variant.name &&
        event.type === "select",
    ).length;
    return { name: variant.name, exposures, conversions };
  });

  if (totals.length !== 2) {
    throw new Error("This analysis expects exactly two variants.");
  }

  const [first, second] = totals;
  const result = zTest(
    first.conversions,
    first.exposures,
    second.conversions,
    second.exposures,
  );
  console.log(`\n${experimentKey} (SIMULATED DATA)`);
  console.log(
    "Variant | Exposures | Selections | Select rate",
  );
  for (const total of totals) {
    const rate = total.conversions / total.exposures;
    console.log(
      `${total.name} | ${total.exposures} | ${total.conversions} | ${(rate * 100).toFixed(2)}%`,
    );
  }
  console.log(
    `Lift (${second.name} vs ${first.name}): ${(result.lift * 100).toFixed(2)}%`,
  );
  console.log(`z-score: ${result.z.toFixed(3)}`);
  console.log(
    `Significant at roughly 95%: ${Math.abs(result.z) > 1.96 ? "yes" : "no"}`,
  );
}

console.log("Synthetic experiment analysis (not real customer data)");
summarize("tile-size");
summarize("preview-delay");
