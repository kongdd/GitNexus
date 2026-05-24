using Parameters

@with_kw struct ModelConfig
    hidden_size::Int = 256
    dropout::Float64 = 0.1
    label::String = "default"
    verbose = false
end

struct Point
    x::Float64
    y::Float64
end

function train(cfg::ModelConfig; epochs::Int=10, lr::Float64=0.001)
    return cfg.hidden_size
end

function distance(a::Point, b::Point)
    return a.x - b.x
end
