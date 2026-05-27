abstract type AbstractAnimal end

abstract type Animal <: AbstractAnimal end

struct Dog <: Animal
    name::String
end

struct Cat <: Animal
    name::String
end

function speak(a::Animal)
    println("...")
end
