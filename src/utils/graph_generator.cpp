#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <random>
#include <limits>

using namespace std;

const int INF = numeric_limits<int>::max();

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

vector< vector<int> > generateRandomGraph(int V){
    srand(time(NULL));
    vector< vector<int> > graph(V, vector<int> (V));
    for(int i=0;i<V;i++){
        for(int j=0;j<V;j++){
            int weight = rand()%150;
            if(weight > 100) graph[i][j] = INF;
            else graph[i][j] = weight;
        }
    }
    return graph;
}

int main(){
    cout << "Generating Random Graph:\n";
    vector< vector<int> > randGraph = generateRandomGraph(4);
    for(int i=0;i<4;i++){
        for(int j=0;j<4;j++){
            if (randGraph[i][j] == INF) {
                cout << "INF ";
            } else {
                cout << randGraph[i][j] << " ";
            }
        }
        cout << "\n";
    }
    cout << "--------\n";

    cout << "Generating Graph from Text File:\n";
    string filename = "data/input/4x4.txt";
    vector< vector<int> > textGraph = generateGraphFromText(filename);
    
    if (textGraph.empty()) {
        cerr << "Failed to load graph from file: " << filename << endl;
        return 1;
    }

    for(int i=0;i<4;i++){
        for(int j=0;j<4;j++){
            if (textGraph[i][j] == INF) {
                cout << "INF ";
            } else {
                cout << textGraph[i][j] << " ";
            }
        }
        cout << "\n";
    }
    cout << "--------\n";
    return 0;
}