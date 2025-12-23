const computeFactorial = (value) => {
  let result = 1n;
  for (let i = 2n; i <= value; i += 1n) {
    result *= i;
  }
  return result;
};

const buildPreview = (value) => {
  const valueString = value.toString();
  if (valueString.length <= 25) {
    return valueString;
  }
  return `${valueString.slice(0, 10)}...${valueString.slice(-10)}`;
};

exports.factorialSimulation = (req, res) => {
  const maxInput = 5000;
  const rawInput = req.query.n ?? "2000";
  const parsedInput = Number.parseInt(rawInput, 10);

  if (Number.isNaN(parsedInput) || parsedInput < 0 || parsedInput > maxInput) {
    return res.status(400).json({
      error: `Введите целое число от 0 до ${maxInput} в параметре n`,
    });
  }

  const numericInput = BigInt(parsedInput);
  const factorial = computeFactorial(numericInput);

  return res.json({
    calculation: "factorial",
    input: parsedInput,
    digits: factorial.toString().length,
    preview: buildPreview(factorial),
  });
};
