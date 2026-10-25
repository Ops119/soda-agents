# x402 paywall kit

This is a reference note for putting HTTP 402 in front of an agent you host yourself.

Soda.agents does not run a pay-per-call meter. Buying this kit does not turn on x402 inside the Soda gateway. The hosted agents you buy from the catalogue are 30-day passes or one-off downloads.

A 402 response, if you build one later, should say:

- which asset you accept
- the amount
- where to pay
- how the client retries with proof

Keep that service on your own host. Do not point it at a Soda API key, and do not ask the caller for a seed phrase.
