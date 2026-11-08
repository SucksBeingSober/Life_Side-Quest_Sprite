const base = "http://127.0.0.1:3100";

const cases = [
  {
    label: "RAIN 15/0",
    body: {
      mood: "normal",
      time: 15,
      budget: 0,
      city: "上海",
      weather: "毛毛雨 19°C，降水 100%",
      weather_code: 51,
      temperature: 19,
      precipitation: 100,
      free: false,
      exclude: [],
    },
  },
  {
    label: "SUN 60/50",
    body: {
      mood: "happy",
      time: 60,
      budget: 50,
      city: "北京",
      weather: "晴 24°C，降水 10%",
      weather_code: 0,
      temperature: 24,
      precipitation: 10,
      free: false,
      exclude: [],
    },
  },
];

for (const item of cases) {
  const response = await fetch(`${base}/api/missions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item.body),
  });
  const data = await response.json();
  console.log(item.label, "source=" + data.source);
  for (const mission of data.missions ?? []) {
    console.log(
      " ",
      mission.rarity,
      mission.title,
      "|",
      mission.tags.join(","),
      "|",
      `${mission.duration_minutes}min`,
      `${mission.estimated_cost}y`,
    );
  }
}
