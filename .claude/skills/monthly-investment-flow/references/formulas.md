# Monthly flow formulas

Core formulas:
- portfolio total = sum(position quantity * current price)
- target value = portfolio total * target percentage
- gap value = target value - current value
- positive gaps participate in suggestion distribution
- suggested amount = monthly budget * (position positive gap / total positive gap)

If total positive gap is zero, all suggested amounts are zero.
