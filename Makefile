GPP = g++
# INPUT = src/cpu/floyd_warshall_cpu.cpp
INPUT = src/utils/graph_generator.cpp
OUTPUT = data/output/temp

run: 
	$(GPP) -o $(OUTPUT) $(INPUT); ./$(OUTPUT)

clean: 
	rm -f $(OUTPUT)