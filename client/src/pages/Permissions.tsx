import React, { useState } from "react";
import { UserPlus, Shield, Settings } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Permissions() {
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    roleId: "",
    name: ""
  });
  const { toast } = useToast();

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["/api/permissions"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const createRoleMutation = useMutation({
    mutationFn: async (roleName: string) => {
      return apiRequest("/api/roles", {
        method: "POST",
        body: { name: roleName }
      });
    },
    onSuccess: () => {
      toast({
        title: "Rol creado",
        description: "El nuevo rol ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsAddRoleOpen(false);
      setNewRoleName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el rol.",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      return apiRequest("/api/users", {
        method: "POST",
        body: {
          email: userData.email,
          password: userData.password,
          roleId: parseInt(userData.roleId),
          name: userData.name
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuario creado",
        description: "El nuevo usuario ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowAddUser(false);
      setNewUserData({ email: "", password: "", roleId: "", name: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el usuario.",
        variant: "destructive",
      });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (data: { roleId: number; permissionId: number; enabled: boolean }) => {
      return apiRequest("/api/role-permissions", {
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
  });

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case "super_admin": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "admin": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "employee": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const groupedPermissions = Array.isArray(permissions) 
    ? permissions.reduce((acc: any, permission: any) => {
        const module = permission.module || "General";
        if (!acc[module]) acc[module] = [];
        acc[module].push(permission);
        return acc;
      }, {})
    : {};

  return (
    <div className="h-screen overflow-y-auto space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Permisos</h1>
        <div className="flex gap-2">
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Añadir Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="user-name">Nombre</Label>
                  <Input
                    id="user-name"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div>
                  <Label htmlFor="user-password">Contraseña</Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Contraseña temporal"
                  />
                </div>
                <div>
                  <Label htmlFor="user-role">Rol</Label>
                  <Select value={newUserData.roleId} onValueChange={(value) => setNewUserData(prev => ({ ...prev, roleId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(roles) && roles.map((role: any) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddUser(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => createUserMutation.mutate(newUserData)}
                    disabled={!newUserData.email.trim() || !newUserData.password.trim() || !newUserData.roleId || createUserMutation.isPending}
                  >
                    Crear Usuario
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Shield className="mr-2 h-4 w-4" />
                Nuevo Rol
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Rol</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="role-name">Nombre del Rol</Label>
                  <Input
                    id="role-name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Ej: Supervisor"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => createRoleMutation.mutate(newRoleName)}
                    disabled={!newRoleName.trim() || createRoleMutation.isPending}
                  >
                    Crear Rol
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="roles">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Roles del Sistema</CardTitle>
              <CardDescription>
                Gestiona los roles y sus permisos específicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.isArray(roles) && roles.map((role: any) => (
                  <Card 
                    key={role.id}
                    className={`cursor-pointer transition-colors ${
                      selectedRole?.id === role.id 
                        ? 'ring-2 ring-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <Badge className={getRoleColor(role.name)}>
                          {role.name === 'super_admin' ? 'Super Admin' : 
                           role.name === 'admin' ? 'Administrador' :
                           role.name === 'manager' ? 'Gerente' :
                           role.name === 'employee' ? 'Empleado' : role.name}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {role.userCount || 0} usuarios
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {role.permissionCount || 0} permisos activos
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedRole && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Permisos para: {selectedRole.name}</CardTitle>
                    <CardDescription>
                      Configura los permisos específicos para este rol
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Object.entries(groupedPermissions).map(([module, modulePermissions]: [string, any]) => (
                        <div key={module} className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            {module}
                          </h4>
                          <div className="pl-6 space-y-2">
                            {modulePermissions.map((permission: any) => {
                              const isEnabled = selectedRole.permissions?.includes(permission.id);
                              return (
                                <div key={permission.id} className="flex items-center justify-between py-2">
                                  <div>
                                    <p className="font-medium text-sm">{permission.name}</p>
                                    <p className="text-xs text-muted-foreground">{permission.description}</p>
                                  </div>
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      updatePermissionMutation.mutate({
                                        roleId: selectedRole.id,
                                        permissionId: permission.id,
                                        enabled: checked,
                                      });
                                    }}
                                    disabled={selectedRole.name === "super_admin"}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                Gestiona los usuarios y sus roles asignados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Acceso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(users) && users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || user.email}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role?.name || 'employee')}>
                          {user.role?.name || 'Sin rol'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('es-DO') : 'Nunca'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}