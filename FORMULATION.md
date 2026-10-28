# Scheduling formulation

Jobs have durations `d = (3, 5, 2, 7, 4, 6)` and machines are `m = 0,1,2`.
Let binary `x[i,m]` be 1 exactly when job `i` is placed on machine `m`.
The total duration is 27, so the ideal load is `T = 27/3 = 9`.

We minimize the nonnegative penalized objective

```
F(x) = sum_m (sum_i d[i] x[i,m] - 9)^2
     + A sum_i (sum_m x[i,m] - 1)^2,       A = 100.
```

The first term is squared load imbalance around the ideal load. The second
enforces exactly one machine per job. Because a feasible assignment with loads
`(9,9,9)` exists, `F=0` is attainable. Since both terms are nonnegative and
`A>0`, every global minimizer is feasible and perfectly balanced.

## QUBO coefficients

Index variables as `v(i,m) = 3*i + m`. Expanding gives

```
F(x) = C + sum_a q[a] x[a] + sum_{a<b} Q[a,b] x[a]x[b]
C = 3*9^2 + 6*A = 843
q[v(i,m)] = d[i]^2 - 18*d[i] - A
Q[v(i,m),v(j,m)] += 2*d[i]*d[j]       (i<j, same machine)
Q[v(i,m),v(i,n)] += 2*A               (m<n, same job)
```

XQMX stores only variable-dependent terms, not `C`; therefore its reported
QUBO energy is `F-C`, whose optimum is `-843`. The scheduling objective itself
is recovered by adding 843, and is 0 at an optimum.

## Equivalent Ising model

With spins `s[a] in {-1,+1}` and `x[a]=(1+s[a])/2`, the QUBO becomes

```
H(s) = offset + sum_a h[a] s[a] + sum_{a<b} J[a,b] s[a]s[b]
J[a,b] = Q[a,b]/4
h[a] = q[a]/2 + sum_{b != a} Q[min(a,b),max(a,b)]/4
offset = C + sum_a q[a]/2 + sum_{a<b} Q[a,b]/4
```

This is the basis conversion performed by Quip's XQSA adapter before it
encodes milli-scale Ising coefficients for the network.
