const computeFactorial = (value) => {
  let result = 1n;
  for (let i = 2n; i <= value; i += 1n) {
    result *= i;
  }
  return result;
};

const buildPreview = (valueString) => {
  if (valueString.length <= 25) {
    return valueString;
  }
  return `${valueString.slice(0, 10)}...${valueString.slice(-10)}`;
};

exports.factorialSimulation = (req, res) => {
  const maxInput = 5000;
  const rawInput = req.query.n ?? "2000";
  const normalizedInput = String(rawInput).trim();

  if (!/^\d+$/.test(normalizedInput)) {
    return res.status(400).json({
      error: `Введите целое число от 0 до ${maxInput} в параметре n`,
    });
  }

  const parsedInput = Number.parseInt(normalizedInput, 10);
  if (Number.isNaN(parsedInput) || parsedInput < 0 || parsedInput > maxInput) {
    return res.status(400).json({
      error: `Please provide an integer between 0 and ${maxInput} in the "n" parameter`,
    });
  }

  const numericInput = BigInt(parsedInput);
  const factorial = computeFactorial(numericInput);
  const factorialString = factorial.toString();

  return res.json({
    calculation: "factorial",
    input: parsedInput,
    digits: factorialString.length,
    preview: buildPreview(factorialString),
  });
};
