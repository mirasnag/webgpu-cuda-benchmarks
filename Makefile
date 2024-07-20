COMPILER = g++
INPUT = src/cpu/floyd_warshall_cpu.cpp
OUTPUT = data/output/temp

run: 
	$(COMPILER) -o $(OUTPUT) $(INPUT); ./$(OUTPUT)

clean: 
	rm -f $(OUTPUT)