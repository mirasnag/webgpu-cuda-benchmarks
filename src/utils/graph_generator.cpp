#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <random>
#include <limits>

using namespace std;

const int INF = 1e9;

vector< vector<int> > generateGraphFromText(const string &filename) {
    ifstream infile(filename);
    if (!infile) {
        cerr << "Error opening file" << endl;
        return vector< vector<int> > ();
    }

    vector< vector<int> > graph;
    string line;
    
    while (getline(infile, line)) {
        vector<int> row;
        string weight;
        istringstream iss(line);
        
        while (iss >> weight) {
            if (weight == "INF") {
                row.push_back(INF);
            } else {
                row.push_back(stoi(weight));
            }
        }
        
        graph.push_back(row);
    }

    infile.close();
    return graph;
}

vector< vector<int> > generateRandomGraph(int V, double density){   // 0 <= density < 1
    srand(time(NULL));
    vector< vector<int> > graph(V, vector<int> (V));
    for(int i=0;i<V;i++){
        for(int j=0;j<V;j++){
            int weight = rand()%INF;
            if(weight > INF*density) graph[i][j] = INF;
            else graph[i][j] = weight;
        }
    }
    return graph;
}

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

int main(){
    cout << "Generating Random Graph:\n";
    vector< vector<int> > randGraph = generateRandomGraph(4, 0.75);
    printMatrix(randGraph);

    cout << "\n";

    cout << "Generating Graph from Text File:\n";
    string filename = "data/input/4x4.txt";
    vector< vector<int> > textGraph = generateGraphFromText(filename);
    
    if (textGraph.empty()) {
        cerr << "Failed to load graph from file: " << filename << endl;
        return 1;
    }

    printMatrix(textGraph);
    return 0;
}