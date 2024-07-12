import { TPairStr, useBank } from "@store/bank";
import { strToPair, timestampToStr } from "@utils/encoding";
import { Line } from "solid-chartjs";
import { createEffect, onMount } from "solid-js";
import { COLORS } from "@utils/colors";
import { Chart, Title, Tooltip, Legend, Colors } from "chart.js";

export interface IPriceChart {
  pair: TPairStr;
}

export function PriceChart(props: IPriceChart) {
  const { exchangeRates } = useBank();

  onMount(() => {
    Chart.register(Title, Tooltip, Legend, Colors);
  });

  const labels = () => {
    const l = (exchangeRates[props.pair] ?? []).map(([timestamp, _]) =>
      timestampToStr(timestamp)
    );

    l.push("Now");

    return l;
  };

  const rates = () => {
    const r = (exchangeRates[props.pair] ?? []).map(([_, rate]) =>
      rate.toPrecision(4)
    );
    r.push(r[r.length - 1]);

    return r;
  };

  const pair = () => strToPair(props.pair);

  const chartData = () => ({
    labels: labels(),
    datasets: [
      {
        label: `${pair().from} to ${pair().into} exchange rate`,
        data: rates(),
        backgroundColor: COLORS.darkBlue,
        borderColor: COLORS.darkBlue,
        tension: 0.4,
        cubicInterpolationMode: "monotone",
        fill: false,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    backgroundColor: COLORS.black,
  };

  return (
    <Line
      data={chartData()}
      plugins={{ colors: { enabled: true } }}
      options={chartOptions}
      width={450}
      height={250}
    />
  );
}
