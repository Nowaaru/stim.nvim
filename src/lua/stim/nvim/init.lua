local stim = { nvim = {} };

function stim.nvim:setup()
    return self;
end

function stim.nvim:initialize_test()
    print("stim.nvim: test initialized");

    local chars = 0;
    local big_dur = 600;
    local small_dur = 50;
    local can_big = true;
    vim.api.nvim_create_autocmd("TextChangedI", {
        callback = function()
            if (can_big) then
                chars = chars + 1;
                if (chars > 15) then
                    chars = 0;
                    can_big = false;
                    vim.fn.ButtplugVibrate(0.4);
                    vim.fn.timer_start(big_dur, function()
                        can_big = true;
                        vim.fn.ButtplugVibrateStop();
                    end)
                else
                    vim.fn.ButtplugVibrate(0.1, small_dur);
                end
            end
        end
    });
end

return stim.nvim;
