# On Demand Discovery

The discovery flows are summarized as follows:
1. On Demand loading of cross network identifiers - using Oracles for identifier lookups in local scheme
2. On Demand loading for all identifiers

## On Demand Discovery using local oracles
- Scheme uses Oracles to map local identifiers to participants of the scheme
- Identifiers for other schemes are discovered via a depth first search, but asking all participants. Proxy participant then forward the request to the connected scheme
- This diagram shows two connected schemes, but this design work for any number of connected schemes.

![Proxy pattern - On Demand Discovery with Oracles](./Proxy%20pattern%20-%20Lazy%20Discovery%20-%20Oracles.png)


## On Demand Discover with incorrectly cached results
- When an identifier moved to another dfsp provider, then the store cache for that participant will route to an unsuccessful get \parties call.

Here is a sequence diagram show how that gets updated.
### Sequence Diagram
![Invalid Cache](Proxy%20pattern%20-%20Lazy%20Discovery%20Identifier%20Cache%20Invalid.png)
