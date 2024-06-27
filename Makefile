COMPILER = g++
INPUT = src/utils/graph_generator.cpp
OUTPUT = data/output/temp

run: 
	$(COMPILER) -o $(OUTPUT) $(INPUT); ./$(OUTPUT)

clean: 
	rm -f $(OUTPUT)