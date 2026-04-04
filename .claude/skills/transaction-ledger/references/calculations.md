# Ledger calculations

Net long holding for a symbol = sum(BUY quantity) - sum(SELL quantity)

Open short exposure = sum(SHORT quantity) - sum(COVER quantity)

Validation should reject actions that would push these below zero in the wrong direction.
