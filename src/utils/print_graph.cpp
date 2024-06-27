#include <vector>
#include <limits>
#include <iostream>

using namespace std;

const int INF = numeric_limits<int>::max();

// Function to print the shortest distance matrix
void printMatrix(const vector< vector<int> >& dist) {
    int V = dist.size();
    for (int i = 0; i < V; ++i) {
        for (int j = 0; j < V; ++j) {
            if (dist[i][j] == INF)
                cout << "INF ";
            else
                cout << dist[i][j] << " ";
        }
        cout << endl;
    }
}