#include <iostream>
#include <vector>
#include <limits>

const int INF = std::numeric_limits<int>::max();

// Function to print the shortest distance matrix
void printMatrix(const std::vector< std::vector<int> >& dist) {
    int V = dist.size();
    for (int i = 0; i < V; ++i) {
        for (int j = 0; j < V; ++j) {
            if (dist[i][j] == INF)
                std::cout << "INF ";
            else
                std::cout << dist[i][j] << " ";
        }
        std::cout << std::endl;
    }
}

// Floyd-Warshall algorithm
void floydWarshall(std::vector< std::vector<int> >& graph) {
    int V = graph.size();
    std::vector< std::vector<int> > dist = graph;

    for (int k = 0; k < V; ++k) {
        for (int i = 0; i < V; ++i) {
            for (int j = 0; j < V; ++j) {
                if (dist[i][k] != INF && dist[k][j] != INF && dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }

    printMatrix(dist);
}

int main() {
    const int V = 4;    
    std::vector< std::vector<int> > graph(V, std::vector<int>(V, INF));

    // Initializing the graph with example values
    graph[0][0] = 0;
    graph[0][1] = 3;
    graph[0][3] = 7;
    graph[1][0] = 8;
    graph[1][1] = 0;
    graph[1][2] = 2;
    graph[2][0] = 5;
    graph[2][2] = 0;
    graph[2][3] = 1;
    graph[3][0] = 2;
    graph[3][3] = 0;
    /*
        Graph:
        0 3 INF 7 
        8 0 2 INF 
        5 INF 0 1 
        2 INF INF 0
    */

    /*
        Result should be: 
        0 3 5 6 
        5 0 2 3 
        3 6 0 1 
        2 5 7 0 
    */
    std::cout << "Input graph matrix:" << std::endl;
    printMatrix(graph);

    std::cout << "\nShortest distances between every pair of vertices:" << std::endl;
    floydWarshall(graph);

    return 0;
}
