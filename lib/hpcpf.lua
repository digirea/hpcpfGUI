

--- for detection platform (return "Windows", "Darwin" or "Linux")

function getPlatform()
    --- command capture
    function captureRedirectErr(cmd)
        local f = assert(io.popen(cmd .. ' 2>&1' , 'r'))
        local s = assert(f:read('*a'))
        f:close()
        s = string.gsub(s, '^%s+', '')
        s = string.gsub(s, '%s+$', '')
        s = string.gsub(s, '[\n\r]+', ' ')
        return s
    end
    if package.config:sub(1,1) == "\\" then
        return 'Windows'
    else
	    local plf = captureRedirectErr('uname')
        return plf -- 'Darwin', 'Linux'
    end
end


-- force buffer flush function
orgPrint = print
print = function(...) orgPrint(...) io.stdout:flush() end


function errorlog(msg)
    io.stderr:write(msg .. '\n')
end


-- File/Dir Utility fuctions

function compressFile(srcname, tarname, verbose, opt)
    local tarcmd
    local optcmd = opt and opt or ''
    local option = (verbose == true) and '-czvf' or '-czf'
    if (getPlatform() == 'Windows') then
        local TAR_CMD = HPCPF_BIN_DIR .. '/tar.exe'
        tarcmd =  TAR_CMD .. ' ' .. optcmd .. ' ' .. option .. ' ' .. tarname .. ' ' .. srcname
    else
        local TAR_CMD = 'tar'
        tarcmd =  TAR_CMD .. ' ' .. optcmd .. ' ' .. option .. ' ' .. tarname .. ' ' .. srcname
    end
    print(tarcmd)
    local handle = io.popen(tarcmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function extractFile(tarname, verbose, opt)
    local tarcmd
    local optcmd = opt and opt or ''
    local option = verbose and '-xvf' or '-xf'
    if (getPlatform() == 'Windows') then
        local TAR_CMD = HPCPF_BIN_DIR .. '/tar.exe'
        tarcmd =  TAR_CMD .. ' ' .. optcmd .. ' '.. option .. ' ' .. tarname
    else
        local TAR_CMD = 'tar'
        tarcmd =  TAR_CMD .. ' ' .. optcmd .. ' '.. option .. ' ' .. tarname
    end
    print(tarcmd)
    local handle = io.popen(tarcmd)
    local result = handle:read("*a")
    handle:close()
    return result
end



function deleteFile(filename)
    local rmcmd
    if (getPlatform() == 'Windows') then
        rmcmd = 'del /Q'
    else
        rmcmd = 'rm '
    end
    local cmd = rmcmd .. ' ' .. filename
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function deleteDir(dirname)
    local rmcmd
    if (getPlatform() == 'Windows') then
        rmcmd = 'rd /q /s'
    else
        rmcmd = 'rm -rf'
    end
    local cmd = rmcmd .. ' ' .. dirname
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function moveFile(fromFile, toFile)
    local mvcmd
    if (getPlatform() == 'Windows') then
        mvcmd = 'move'
    else
        mvcmd = 'mv'
    end
    local cmd = mvcmd .. ' ' .. fromFile .. ' ' .. toFile
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end


function copyFile(fromFile, toFile)
    local cpcmd
    if (getPlatform() == 'Windows') then
        cpcmd = 'copy'
    else
        cpcmd = 'cp'
    end
    local cmd = cpcmd .. ' ' .. fromFile .. ' ' .. toFile
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

function makeDir(dirpath)
    local mkcmd = 'mkdir'
    local cmd = mkcmd .. ' ' .. dirpath
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result
end

--- Lua Utility

function dumpTable(t,prefix)
    if (prefix==nil) then prefix="" end
    for i,v in pairs(t) do
        print(prefix,i,v)
        if (type(v)=='table') then
            dumpTable(v,prefix.."-")
        end
    end
end



--- execution for CASE
 
local s_base_path=""
function setBasePath(dir)
    s_base_path = dir
end
function getBasePath()
    return s_base_path 
end


function execmd(command)
    local handle = io.popen(command,"r")
    local content = handle:read("*all")
    handle:close()
    return content
end

function getCurrentDir()
    local pwdcmd
    if (getPlatform() == 'Windows') then
        pwdcmd = 'cd'
    else
        pwdcmd = 'pwd'
    end
    
    return execmd(pwdcmd):gsub('\n','')
end

--- JSON loader

local json = require('dkjson')

function readJSON(filename)
    local filestr = ''
    local fp = io.open('.' .. getBasePath() .. '/' ..filename,'r');
	print("JSONPath", '.' .. getBasePath() .. '/' ..filename)
    local jst = nil
    if (fp) then
        filestr = fp:read("*all")
        jst = json.decode (filestr, 1, nil)
    end
    return jst;
end

function writeJSON(filename, tbl)
	local filestr = ''
	local fp = io.open('.' .. getBasePath() .. '/' ..filename,'w');
	if (fp) then
		fp:write(json.encode(tbl, { indent = true }))
		fp:close();
	end
end

function writeCEI(path, tbl, status)
	if (tbl.hpcpf == nil) then
		return;
	end
	tbl.hpcpf.case_exec_info.status = status;
	writeJSON(path, tbl);
end


function getInitialCeiDescription(workdir, server, hosttype)
	return {
		hpcpf = {
			case_exec_info = {
				work_dir = server .. ":" .. workdir,
				target = hosttype
			}
		}
	}
end

function executeCASE(casename,...)
    local args_table = {...}
    --print("num="..#args_table)
    local cf = loadfile('./'..casename..'/cwf.lua');
	local result = nil;
    if (cf == nil) then
        print("Can't find Case work flow:"..casename)
        print("or can't find " .. casename..'/cwf.lua')
    else
        print("--- Start CASE: "..casename.." ---")
        setBasePath('/' .. casename)
        local oldPackagePath = package.path
        package.path = "./" .. casename .. "/?.lua;" .. oldPackagePath
		
		-- write cei.json
		local ceiFile = "cei.json";
		local cei = readJSON(ceiFile);
		if (cei == nil) then
			local targetconf = generateTargetConf(args_table);
			local workdir = targetconf.workpath;
			if string.sub(workdir, workdir:len()) ~= '/' then
				workdir = workdir .. '/'
			end
			workdir = workdir .. casename .. '/'
			cei = getInitialCeiDescription(workdir,  targetconf.server, targetconf.type);
			writeCEI(ceiFile, cei, 'running')
		else
			if (cei.hpcpf.case_exec_info.status == 'finished') then
				print("--- End   CASE: "..casename.." ---")
				return cei.hpcpf.case_exec_info.result;
			end
		end
		
		-- execute
		result = cf(args_table)
		
		-- write result to cei.json
		if (result ~= nil) then
			cei.hpcpf.case_exec_info.result = result;
			writeCEI(ceiFile, cei, 'finished');
		else
			writeCEI(ceiFile, cei, 'failed');
		end
		
        package.path = oldPackagePath
        setBasePath('')
        print("--- End   CASE: "..casename.." ---")
    end
	return result;
end


--- Sleep
function sleep(n)
    if getPlatform() == 'Windows' then
        --os.execute("timeout /NOBREAK /T " .. math.floor(tonumber(n)) .. ' > nul')
        local cmd = HPCPF_BIN_DIR .. '/sleeper.exe ' .. math.floor(n)
        os.execute(cmd)
    else
        os.execute("sleep " .. tonumber(n))
    end
end

function generateTargetConf(args_table)
	for i, k in pairs(args_table) do
		--print(i, k);
		if (i == 1) and next(k) then
			for n, m in pairs(k) do
				--print(n, m);
				if n == "machine" then
					return m;
				end
			end
		end
	end
end

function getCores(args_table)
	for i, k in pairs(args_table) do
		if (i == 1) and next(k) then
			for n, m in pairs(k) do
				if n == "cores" then
					return m;
				end
			end
		end
	end
	return 1;
end

function getInputNodes(args_table)
	local list = {}
	for i, k in pairs(args_table) do
		if (i == 3) then
			for n, m in pairs(k) do
				table.insert(list, m);
			end
		end
	end
	return list;
end

function getOutputFiles()
	local cmdFile = 'cmd.json';
	local cmd = readJSON(cmdFile);
	local result = nil;
	if (cmd ~= nil) then
		if (cmd.hpcpf.case_meta_data.outputs ~= nil) then
			result = cmd.hpcpf.case_meta_data.outputs;
		end
	end
	return result;
end

function getNodes(args_table)
	for i, k in pairs(args_table) do
		if (i == 1) and next(k) then
			for n, m in pairs(k) do
				if n == "nodes" then
					return m;
				end
			end
		end
	end
	return 1;
end

function isDryRun(args_table)
	for i, k in pairs(args_table) do
		if (i == 2) then
			return k;
		end
	end
	return false;
end

-- xjob
require('xjob')
