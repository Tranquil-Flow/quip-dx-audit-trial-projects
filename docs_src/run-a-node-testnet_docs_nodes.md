# Run A Node (TestNet)

You can run a quip testnet node using the node manager application:

[https://gitlab.com/quip.network/quip-node-manager/-/releases](https://gitlab.com/quip.network/quip-node-manager/-/releases)

The primary user interface is a graphical user interface which will walk you through and test your environment to ensure you can connect to the network. This tool also has a command line only terminal UI as well with the same functionality.

## Running on a Server

If you're a little more tech savvy, can verify your own connectivity, and want to run this on a server, you can trivially deploy on servers using a docker-compose deployment repository:

[https://gitlab.com/quip.network/nodes.quip.network](https://gitlab.com/quip.network/nodes.quip.network)

In general, you will need to open a port (20049 recommended, but you control it) and configure the node through the config file. It is also highly recommended to install the cron job so the node automatically updates as updates come out.

## Developers

Developers can download, compile, and run a node here:\
\
[https://gitlab.com/quip.network/quip-protocol/](https://gitlab.com/quip.network/quip-protocol/)

We do not recommend doing this UNLESS you are experimenting

For what your hardware will actually be solving once the node is running, see [Miners](/docs/nodes/miners). To generate quantum-resistant keys as well, see the [Quickstart](/docs/getting-started/quickstart).
