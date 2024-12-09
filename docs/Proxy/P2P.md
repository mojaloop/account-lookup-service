# P2P flow across network using Proxy
This design make the following assumptions
1. No two connected participant have the same identifier
1. No limit checks are done against proxy participants
1. Get \transaction request are resolved at the payee scheme
1. Timeouts in non-payee schemes are  disabled (maybe enlarged)

## Sequence Diagram
Here is a sequence diagram show the Agreement and Transfer stages of a transaction, and how the Get Transfer is resolved.

![P2P flow](./Proxy%20pattern%20-%20P2P.png)